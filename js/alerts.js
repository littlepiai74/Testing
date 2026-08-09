import { ALERT_RULES } from "./config.js";

let seq = 0;
function makeAlert(severity, title, detail) {
  return { id: `a${++seq}`, severity, title, detail, ts: Date.now() };
}

// severity: 'critical' | 'warning' | 'notice'
export function evaluateAlerts(quotesById, allocationRows) {
  const alerts = [];

  const vix = quotesById.get("vix");
  if (vix) {
    if (vix.price >= vix.meta.thresholds.critical) {
      alerts.push(makeAlert("critical", "Risk-off warning", `VIX at ${vix.price.toFixed(1)} — above critical threshold (${vix.meta.thresholds.critical}).`));
    } else if (vix.price >= vix.meta.thresholds.warning) {
      alerts.push(makeAlert("warning", "Elevated volatility", `VIX at ${vix.price.toFixed(1)} — above warning threshold (${vix.meta.thresholds.warning}).`));
    }
  }

  const vhsi = quotesById.get("vhsi");
  if (vhsi && vhsi.price >= vhsi.meta.thresholds.warning) {
    const sev = vhsi.price >= vhsi.meta.thresholds.critical ? "critical" : "warning";
    alerts.push(makeAlert(sev, "HK volatility elevated", `VHSI at ${vhsi.price.toFixed(1)}.`));
  }

  for (const q of quotesById.values()) {
    if (!q.meta.region) continue; // indices only
    const abs = Math.abs(q.chgPct);
    if (abs >= ALERT_RULES.indexMoveCritical) {
      alerts.push(makeAlert("critical", `${q.name} sharp move`, `${q.chgPct >= 0 ? "+" : ""}${q.chgPct.toFixed(2)}% today.`));
    } else if (abs >= ALERT_RULES.indexMoveWarning) {
      alerts.push(makeAlert("warning", `${q.name} moving`, `${q.chgPct >= 0 ? "+" : ""}${q.chgPct.toFixed(2)}% today.`));
    }
  }

  const hkd = quotesById.get("usdhkd");
  if (hkd && hkd.meta.pegBand) {
    const [lo, hi] = hkd.meta.pegBand;
    const distToEdge = Math.min(Math.abs(hkd.price - lo), Math.abs(hkd.price - hi));
    if (distToEdge <= 0.01) {
      alerts.push(makeAlert("warning", "HKD peg watch", `USD/HKD at ${hkd.price.toFixed(4)} — near Convertibility Undertaking band edge (${lo.toFixed(2)}–${hi.toFixed(2)}).`));
    }
  }

  const us2y = quotesById.get("us2y");
  const us10y = quotesById.get("us10y");
  if (us2y && us10y) {
    const spread = us10y.price - us2y.price;
    if (spread < 0) {
      alerts.push(makeAlert("warning", "Yield curve inverted", `10Y-2Y spread at ${(spread * 100).toFixed(0)}bp.`));
    } else if (spread < ALERT_RULES.yieldCurveInvertWarning) {
      alerts.push(makeAlert("notice", "Yield curve flattening", `10Y-2Y spread at ${(spread * 100).toFixed(0)}bp.`));
    }
  }

  for (const row of allocationRows) {
    const drift = row.current - row.target;
    const abs = Math.abs(drift);
    if (abs >= ALERT_RULES.driftCritical) {
      alerts.push(makeAlert("critical", `${row.label} drift`, `${drift >= 0 ? "+" : ""}${drift.toFixed(1)}pp vs target — rebalance review recommended.`));
    } else if (abs >= ALERT_RULES.driftWarning) {
      alerts.push(makeAlert("warning", `${row.label} drift`, `${drift >= 0 ? "+" : ""}${drift.toFixed(1)}pp vs target.`));
    }
  }

  const order = { critical: 0, warning: 1, notice: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  return alerts;
}
