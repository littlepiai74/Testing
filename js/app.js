import {
  INDICES, RATES, FX, COMMODITIES, VOLATILITY, SECTORS, MPF_ALLOCATION_TARGET, REGIONS,
} from "./config.js";
import { createDataService } from "./dataService.js";
import { getSessionStatuses } from "./sessions.js";
import { evaluateAlerts } from "./alerts.js";
import {
  sparklineSVG, donutSVG, gaugeSVG, yieldCurveSVG, meterSVG,
  divergingColor, deltaColor, fmtNum, fmtSigned,
} from "./charts.js";

const CATEGORICAL = ["--series-blue", "--series-orange", "--series-aqua", "--series-yellow",
  "--series-magenta", "--series-green", "--series-violet", "--series-red"];

// ---------- Theme ----------
const themeToggle = document.getElementById("themeToggle");
function applyTheme(theme) {
  if (theme) document.documentElement.setAttribute("data-theme", theme);
  else document.documentElement.removeAttribute("data-theme");
}
(function initTheme() {
  const saved = localStorage.getItem("mpf-dashboard-theme");
  applyTheme(saved);
})();
themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : current === "light" ? null : "dark";
  applyTheme(next);
  if (next) localStorage.setItem("mpf-dashboard-theme", next);
  else localStorage.removeItem("mpf-dashboard-theme");
});

// ---------- Clock + sessions ----------
const clockEl = document.getElementById("clock");
const sessionsEl = document.getElementById("sessions");

function renderClock() {
  const now = new Date();
  const hk = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hong_Kong", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  const local = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(now);
  clockEl.innerHTML = `HKT ${hk} <span style="color:var(--text-muted)">· Local ${local}</span>`;
}

function renderSessions() {
  const sessions = getSessionStatuses();
  sessionsEl.innerHTML = sessions.map((s) => `
    <div class="session ${s.isOpen ? "open" : ""}">
      <span class="dot"></span>
      <span class="tname">${s.name}</span>
      <span>${s.timeStr} ${s.isOpen ? "open" : "closed"}</span>
    </div>
  `).join("");
}

setInterval(() => { renderClock(); }, 1000);
setInterval(renderSessions, 30000);
renderClock(); renderSessions();

// ---------- Allocation drift state (slow random walk around the target) ----------
const allocState = new Map(MPF_ALLOCATION_TARGET.map((row) => [row.id, row.value + (Math.random() - 0.5) * 3]));
function stepAllocation() {
  for (const row of MPF_ALLOCATION_TARGET) {
    const cur = allocState.get(row.id);
    const pull = (row.value - cur) * 0.02;
    const noise = (Math.random() - 0.5) * 0.15;
    allocState.set(row.id, cur + pull + noise);
  }
}
function getAllocationRows() {
  return MPF_ALLOCATION_TARGET.map((row) => ({ ...row, current: allocState.get(row.id) }));
}

// ---------- Sector heatmap state ----------
const sectorState = new Map(SECTORS.map((s) => [s, (Math.random() - 0.5) * 2]));
function stepSectors() {
  for (const s of SECTORS) {
    const cur = sectorState.get(s);
    const pull = -cur * 0.05;
    const noise = (Math.random() - 0.5) * 0.35;
    let next = cur + pull + noise;
    next = Math.max(-4, Math.min(4, next));
    sectorState.set(s, next);
  }
}

// ---------- Table rendering ----------
function indexRowsHTML(quotes) {
  return quotes.map((q) => `
    <tr>
      <td class="name">${q.name}<div class="market">${q.meta.market}</div></td>
      <td class="num">${fmtNum(q.price, q.decimals)}</td>
      <td class="num" style="color:${deltaColor(q.chgPct)}">${fmtSigned(q.chgAbs, q.decimals)}</td>
      <td class="num" style="color:${deltaColor(q.chgPct)}">${fmtSigned(q.chgPct, 2, "%")}</td>
      <td class="sparkcell">${sparklineSVG(q.history, { positive: q.chgPct >= 0 })}</td>
    </tr>
  `).join("");
}

function renderIndexTable(containerId, region, quotesById) {
  const rows = INDICES.filter((i) => i.region === region).map((i) => quotesById.get(i.id)).filter(Boolean);
  document.getElementById(containerId).innerHTML = `
    <table class="instr">
      <thead><tr><th>Index</th><th style="text-align:right">Last</th><th style="text-align:right">Chg</th><th style="text-align:right">Chg %</th><th style="text-align:right">Trend</th></tr></thead>
      <tbody>${indexRowsHTML(rows)}</tbody>
    </table>`;
}

function renderRatesPanel(quotesById) {
  const us2y = quotesById.get("us2y"), us10y = quotesById.get("us10y"), us30y = quotesById.get("us30y");
  const points = [us2y, us10y, us30y].filter(Boolean).map((q) => ({ label: q.meta.id.replace("us", "").toUpperCase(), value: q.price }));
  document.getElementById("yieldCurveWrap").innerHTML = points.length
    ? `<div style="display:flex;justify-content:center">${yieldCurveSVG(points)}</div>`
    : "";

  const rows = RATES.map((r) => quotesById.get(r.id)).filter(Boolean).map((q) => `
    <tr>
      <td class="name">${q.name}</td>
      <td class="num">${fmtNum(q.price, q.decimals)}${q.unit}</td>
      <td class="num" style="color:${deltaColor(q.chgAbs)}">${fmtSigned(q.chgAbs * 100, 0)}bp</td>
      <td class="sparkcell">${sparklineSVG(q.history, { positive: q.chgAbs >= 0 })}</td>
    </tr>`).join("");
  document.getElementById("tbl-rates").innerHTML = `
    <table class="instr">
      <thead><tr><th>Rate</th><th style="text-align:right">Level</th><th style="text-align:right">Chg</th><th style="text-align:right">Trend</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function renderFxPanel(quotesById) {
  const rows = FX.map((f) => quotesById.get(f.id)).filter(Boolean).map((q) => `
    <tr>
      <td class="name">${q.name}</td>
      <td class="num">${fmtNum(q.price, q.decimals)}</td>
      <td class="num" style="color:${deltaColor(q.chgPct)}">${fmtSigned(q.chgPct, 2, "%")}</td>
      <td class="sparkcell">${sparklineSVG(q.history, { positive: q.chgPct >= 0 })}</td>
    </tr>`).join("");
  document.getElementById("tbl-fx").innerHTML = `
    <table class="instr">
      <thead><tr><th>Pair</th><th style="text-align:right">Rate</th><th style="text-align:right">Chg %</th><th style="text-align:right">Trend</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  const hkd = quotesById.get("usdhkd");
  if (hkd) {
    const [lo, hi] = hkd.meta.pegBand;
    const pct = Math.max(0, Math.min(1, (hkd.price - lo) / (hi - lo)));
    document.getElementById("hkdPeg").innerHTML = `
      <div style="margin-top:10px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:4px">
          <span>Weak-side ${lo.toFixed(2)}</span><span>Linked Exchange Rate band</span><span>Strong-side ${hi.toFixed(2)}</span>
        </div>
        <div style="position:relative;height:10px;background:var(--track);border-radius:5px">
          <div style="position:absolute;left:${(pct * 100).toFixed(1)}%;top:-3px;width:2px;height:16px;background:var(--text-primary);transform:translateX(-1px)"></div>
        </div>
        <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">USD/HKD ${hkd.price.toFixed(4)} — HKMA Convertibility Undertaking zone</div>
      </div>`;
  }
}

function renderCommodities(quotesById) {
  const rows = COMMODITIES.map((c) => quotesById.get(c.id)).filter(Boolean).map((q) => `
    <tr>
      <td class="name">${q.name}</td>
      <td class="num">${fmtNum(q.price, q.decimals)} <span class="market">${q.unit}</span></td>
      <td class="num" style="color:${deltaColor(q.chgPct)}">${fmtSigned(q.chgPct, 2, "%")}</td>
      <td class="sparkcell">${sparklineSVG(q.history, { positive: q.chgPct >= 0 })}</td>
    </tr>`).join("");
  document.getElementById("tbl-commod").innerHTML = `
    <table class="instr">
      <thead><tr><th>Commodity</th><th style="text-align:right">Last</th><th style="text-align:right">Chg %</th><th style="text-align:right">Trend</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function zonesFor(thresholds, max) {
  return [
    { from: 0, to: thresholds.warning, color: "var(--status-good)" },
    { from: thresholds.warning, to: thresholds.critical, color: "var(--status-warning)" },
    { from: thresholds.critical, to: max, color: "var(--status-critical)" },
  ];
}

function renderGauges(quotesById) {
  const html = VOLATILITY.map((v) => {
    const q = quotesById.get(v.id);
    if (!q) return "";
    const max = v.thresholds.critical * 1.4;
    return `
      <div class="gauge-card">
        <div class="gauge-label">${q.name}</div>
        ${gaugeSVG(q.price, { min: 0, max, zones: zonesFor(v.thresholds, max) })}
        <div class="gauge-value" style="color:${deltaColor(-q.chgAbs)}">${fmtNum(q.price, 2)}</div>
        <div class="gauge-legend">
          <span><i style="background:var(--status-good)"></i>Calm</span>
          <span><i style="background:var(--status-warning)"></i>Elevated</span>
          <span><i style="background:var(--status-critical)"></i>Stress</span>
        </div>
      </div>`;
  }).join("");
  document.getElementById("gaugeRow").innerHTML = html;
}

function renderAllocation() {
  const rows = getAllocationRows();
  const segments = rows.map((r, i) => ({ label: r.label, value: Math.max(0, r.current), color: `var(${CATEGORICAL[i % CATEGORICAL.length]})` }));
  const donut = donutSVG(segments);
  const legend = rows.map((r, i) => `
    <div class="alloc-row">
      <span class="alloc-swatch" style="background:var(${CATEGORICAL[i % CATEGORICAL.length]})"></span>
      <span class="alloc-label">${r.label}</span>
      <span class="alloc-figs">${r.current.toFixed(1)}%</span>
    </div>`).join("");
  document.getElementById("allocDonut").innerHTML = `
    <div class="alloc-wrap">
      <div>${donut}</div>
      <div class="alloc-legend">${legend}</div>
    </div>`;

  const meters = rows.map((r, i) => {
    const drift = r.current - r.value;
    return `
      <div class="meter-row">
        <div class="meter-top">
          <span class="t">${r.label}</span>
          <span>${r.current.toFixed(1)}% <span style="color:var(--text-muted)">/ target ${r.value}%</span>
            <b style="color:${Math.abs(drift) >= 2.5 ? "var(--status-critical)" : "var(--text-secondary)"}">(${drift >= 0 ? "+" : ""}${drift.toFixed(1)}pp)</b>
          </span>
        </div>
        ${meterSVG(r.current, r.value, { color: `var(${CATEGORICAL[i % CATEGORICAL.length]})` })}
      </div>`;
  }).join("");
  document.getElementById("allocMeters").innerHTML = meters;

  return rows;
}

function renderHeatmap() {
  const html = SECTORS.map((s) => {
    const v = sectorState.get(s);
    const bg = divergingColor(v, 3);
    const textColor = Math.abs(v) < 0.15 ? "var(--text-secondary)" : bg;
    return `
      <div class="heat-cell" style="background:color-mix(in srgb, ${bg} 20%, var(--surface-1));border-color:color-mix(in srgb, ${bg} 45%, transparent)">
        <div class="hc-label">${s}</div>
        <div class="hc-value" style="color:${textColor}">${v >= 0 ? "+" : ""}${v.toFixed(2)}%</div>
      </div>`;
  }).join("");
  document.getElementById("heatmap").innerHTML = html;
}

function renderKpis(quotesById) {
  const picks = [
    { id: "hsi", label: "Hang Seng Index" },
    { id: "spx", label: "S&P 500" },
    { id: "vix", label: "VIX" },
    { id: "us10y", label: "US 10Y Yield" },
    { id: "usdhkd", label: "USD/HKD" },
  ];
  const apacDelta = INDICES.filter((i) => i.region === REGIONS.APAC).map((i) => quotesById.get(i.id)).filter(Boolean);
  const composite = apacDelta.length ? apacDelta.reduce((s, q) => s + q.chgPct, 0) / apacDelta.length : 0;

  const tiles = picks.map((p) => {
    const q = quotesById.get(p.id);
    if (!q) return "";
    const chg = p.id === "us10y" ? q.chgAbs * 100 : q.chgPct;
    const suffix = p.id === "us10y" ? "bp" : p.id === "usdhkd" ? "%" : "%";
    return `
      <div class="kpi-tile">
        <div class="kpi-label">${p.label}</div>
        <div class="kpi-value">${fmtNum(q.price, q.decimals)}</div>
        <div class="kpi-delta" style="color:${deltaColor(chg)}">${fmtSigned(chg, p.id === "us10y" ? 0 : 2, suffix)}</div>
      </div>`;
  }).join("");

  const compositeTile = `
    <div class="kpi-tile">
      <div class="kpi-label">Asia-Pacific Equity Composite</div>
      <div class="kpi-value" style="color:${deltaColor(composite)}">${fmtSigned(composite, 2, "%")}</div>
      <div class="kpi-delta" style="color:var(--text-muted)">equal-weight, ${apacDelta.length} indices</div>
    </div>`;

  document.getElementById("kpiStrip").innerHTML = tiles + compositeTile;
}

function renderAlerts(quotesById, allocRows) {
  const alerts = evaluateAlerts(quotesById, allocRows);
  const el = document.getElementById("alertsList");
  if (!alerts.length) {
    el.innerHTML = `<div class="alerts-empty">No active alerts — all monitored thresholds within normal range.</div>`;
    return;
  }
  el.innerHTML = alerts.slice(0, 20).map((a) => `
    <div class="alert-item">
      <span class="alert-icon ${a.severity}">${a.severity === "critical" ? "!" : a.severity === "warning" ? "!" : "i"}</span>
      <div class="alert-body">
        <div class="alert-title">${a.title}</div>
        <div class="alert-detail">${a.detail}</div>
      </div>
    </div>`).join("");
}

// ---------- Data status ----------
const statusPill = document.getElementById("dataStatusPill");
const statusText = document.getElementById("dataStatusText");
const footerStatus = document.getElementById("footerStatus");

function renderStatus(payload) {
  const isLive = payload.status === "live-proxy";
  statusPill.className = `status-pill ${isLive ? "live" : "sim"}`;
  statusText.textContent = isLive ? "LIVE (proxy feed)" : "SIMULATED";
  const t = new Date(payload.at).toLocaleTimeString();
  footerStatus.innerHTML = isLive
    ? `<b>Live feed active</b> via local proxy — last synced ${new Date(payload.lastLiveSyncAt).toLocaleTimeString()}. Updated ${t}.`
    : `<b>Simulated feed</b> — no live market data source connected. Motion is a realistic random walk, not real prices. Updated ${t}.`;
}

// ---------- Wire it up ----------
const service = createDataService();
service.subscribe((payload) => {
  const quotesById = new Map(payload.quotes.map((q) => [q.id, q]));

  stepAllocation();
  stepSectors();

  renderKpis(quotesById);
  renderIndexTable("tbl-apac", REGIONS.APAC, quotesById);
  renderIndexTable("tbl-europe", REGIONS.EUROPE, quotesById);
  renderIndexTable("tbl-americas", REGIONS.AMERICAS, quotesById);
  renderRatesPanel(quotesById);
  renderFxPanel(quotesById);
  renderCommodities(quotesById);
  renderGauges(quotesById);
  const allocRows = renderAllocation();
  renderHeatmap();
  renderAlerts(quotesById, allocRows);
  renderStatus(payload);
});
service.start();
