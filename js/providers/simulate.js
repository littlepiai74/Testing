// Realistic-motion simulated feed: mean-reverting random walk per instrument.
// This is the zero-config default so the dashboard is fully functional with no API keys.
// It is NOT market data. Every panel that reads from this provider is labeled SIMULATED
// in the UI (see app.js) so nobody mistakes it for a live print.

function randNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function createSimulationEngine(instruments, { historyLength = 48 } = {}) {
  const state = new Map();

  for (const inst of instruments) {
    const dailyDriftPct = (Math.random() - 0.5) * inst.vol * 6; // slow intraday trend target
    const open = inst.baseline;
    const target = inst.pegBand
      ? Math.min(Math.max(open, inst.pegBand[0] + 0.01), inst.pegBand[1] - 0.01)
      : open * (1 + dailyDriftPct);
    state.set(inst.id, {
      inst,
      open,
      target,
      price: open,
      prevPrice: open,
      history: Array.from({ length: historyLength }, () => open),
    });
  }

  function tick() {
    const snapshot = [];
    for (const s of state.values()) {
      const { inst } = s;
      s.prevPrice = s.price;
      const noise = s.price * inst.vol * 0.35 * randNormal();
      const pull = (s.target - s.price) * 0.03; // gentle reversion toward the session target
      let next = s.price + noise + pull;

      if (inst.pegBand) {
        next = Math.min(Math.max(next, inst.pegBand[0]), inst.pegBand[1]);
      }
      if (next <= 0) next = s.price;

      s.price = next;
      s.history.push(next);
      if (s.history.length > historyLength) s.history.shift();

      snapshot.push(toQuote(s));
    }
    return snapshot;
  }

  function getSnapshot() {
    return Array.from(state.values()).map(toQuote);
  }

  // Nudges a simulated instrument toward a real print, used when a live proxy is available.
  // Keeps the smooth tick-by-tick animation while anchoring level + daily-change to reality.
  function steerTarget(id, realPrice, prevClose) {
    const s = state.get(id);
    if (!s || typeof realPrice !== "number" || !isFinite(realPrice) || realPrice <= 0) return;
    if (typeof prevClose === "number" && isFinite(prevClose) && prevClose > 0) s.open = prevClose;
    s.target = realPrice;
    s.price = s.price + (realPrice - s.price) * 0.6;
  }

  function toQuote(s) {
    const { inst } = s;
    const chgAbs = s.price - s.open;
    const chgPct = (chgAbs / s.open) * 100;
    return {
      id: inst.id,
      name: inst.name,
      price: s.price,
      prevTick: s.prevPrice,
      open: s.open,
      chgAbs,
      chgPct,
      decimals: inst.decimals,
      unit: inst.unit,
      history: s.history.slice(),
      meta: inst,
    };
  }

  return { tick, getSnapshot, steerTarget };
}
