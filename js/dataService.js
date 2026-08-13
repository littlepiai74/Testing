import { INDICES, RATES, FX, COMMODITIES, VOLATILITY, CREDIT, REFRESH_INTERVAL_MS } from "./config.js";
import { createSimulationEngine } from "./providers/simulate.js";
import { probeLocalProxy, fetchQuotes } from "./providers/localProxy.js";

const ALL_INSTRUMENTS = [...INDICES, ...RATES, ...FX, ...COMMODITIES, ...VOLATILITY, ...CREDIT];
const BY_ID = new Map(ALL_INSTRUMENTS.map((i) => [i.id, i]));
const BY_FEED_SYMBOL = new Map(ALL_INSTRUMENTS.filter((i) => i.feedSymbol).map((i) => [i.feedSymbol, i.id]));

const PROXY_RECHECK_TICKS = 6; // re-probe the proxy every N ticks (also covers "it just came up")

export function createDataService() {
  const engine = createSimulationEngine(ALL_INSTRUMENTS);
  const listeners = new Set();

  let status = "simulated"; // 'simulated' | 'live-proxy'
  let lastLiveSyncAt = null;
  let proxyAvailable = false;
  let tickCount = 0;
  let timer = null;

  async function maybeSyncFromProxy() {
    if (tickCount % PROXY_RECHECK_TICKS === 0) {
      proxyAvailable = await probeLocalProxy();
    }
    if (!proxyAvailable) return false;

    try {
      const quotes = await fetchQuotes(ALL_INSTRUMENTS);
      let applied = 0;
      for (const q of quotes) {
        const id = BY_FEED_SYMBOL.get(q.symbol) || (BY_ID.has(q.symbol) ? q.symbol : null);
        if (!id || typeof q.price !== "number" || !isFinite(q.price)) continue;
        engine.steerTarget?.(id, q.price, q.prevClose);
        applied++;
      }
      if (applied > 0) {
        lastLiveSyncAt = Date.now();
        return true;
      }
      return false;
    } catch {
      proxyAvailable = false;
      return false;
    }
  }

  async function tick() {
    tickCount++;
    const live = await maybeSyncFromProxy();
    status = live || (lastLiveSyncAt && Date.now() - lastLiveSyncAt < REFRESH_INTERVAL_MS * (PROXY_RECHECK_TICKS + 2))
      ? "live-proxy"
      : "simulated";
    const snapshot = engine.tick();
    const payload = { quotes: snapshot, status, lastLiveSyncAt, at: Date.now() };
    for (const cb of listeners) cb(payload);
  }

  function subscribe(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function start() {
    if (timer) return;
    tick(); // fire immediately so the UI isn't blank
    timer = setInterval(tick, REFRESH_INTERVAL_MS);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
  }

  function getById(id) {
    return engine.getSnapshot().find((q) => q.id === id);
  }

  return { start, stop, subscribe, getById, instruments: ALL_INSTRUMENTS };
}
