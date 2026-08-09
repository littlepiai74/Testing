// Hand-rolled inline-SVG chart primitives (no charting library dependency).
// Marks follow the dataviz skill spec: 2px lines, 4px rounded bar ends, 8px+ dot
// targets with a surface ring, hairline gridlines, color assigned by job
// (categorical identity / sequential magnitude / diverging polarity / status state).

function cssVar(name, fallback = "") {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(n, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function lerpColor(a, b, t) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bch = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bch})`;
}

// Diverging blue (negative) <-> gray (0) <-> red (positive), clamped at +/-clampAbs.
export function divergingColor(value, clampAbs = 2.5) {
  const neg = cssVar("--series-blue", "#2a78d6");
  const mid = cssVar("--diverging-mid", "#f0efec");
  const pos = cssVar("--series-red", "#e34948");
  const t = Math.max(-1, Math.min(1, value / clampAbs));
  return t >= 0 ? lerpColor(mid, pos, t) : lerpColor(mid, neg, -t);
}

export function deltaColor(value) {
  return value >= 0 ? "var(--delta-up)" : "var(--delta-down)";
}

export function fmtNum(value, decimals = 2) {
  return value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtSigned(value, decimals = 2, suffix = "") {
  const s = value >= 0 ? "+" : "";
  return `${s}${fmtNum(value, decimals)}${suffix}`;
}

// --- Sparkline -------------------------------------------------------------
export function sparklineSVG(values, { width = 96, height = 28, positive = true } = {}) {
  if (!values || values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  const color = positive ? "var(--delta-up)" : "var(--delta-down)";
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" class="sparkline" aria-hidden="true">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3" fill="${color}" stroke="var(--surface-1)" stroke-width="2" />
  </svg>`;
}

// --- Donut (allocation mix) --------------------------------------------------
export function donutSVG(segments, { size = 148, thickness = 20 } = {}) {
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const gap = 2; // surface gap between segments
  const arcs = segments.map((seg) => {
    const frac = seg.value / total;
    const len = Math.max(0, frac * circumference - gap);
    const dasharray = `${len} ${circumference - len}`;
    const dashoffset = -offset;
    offset += frac * circumference;
    return `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thickness}"
      stroke-dasharray="${dasharray}" stroke-dashoffset="${dashoffset}" transform="rotate(-90 ${c} ${c})"
      stroke-linecap="round"><title>${seg.label}: ${seg.value.toFixed(1)}%</title></circle>`;
  }).join("");
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Allocation mix">
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--gridline)" stroke-width="${thickness}" />
    ${arcs}
  </svg>`;
}

// --- Semicircular gauge (VIX / VHSI) ----------------------------------------
export function gaugeSVG(value, { min = 0, max = 40, zones = [], size = 160 } = {}) {
  const w = size, h = size * 0.62;
  const cx = w / 2, cy = h - 8, r = w / 2 - 14;
  const clamped = Math.max(min, Math.min(max, value));
  const pct = (clamped - min) / (max - min);
  const angle = Math.PI - pct * Math.PI; // pi (left) -> 0 (right)
  const needleX = cx + r * 0.86 * Math.cos(angle);
  const needleY = cy - r * 0.86 * Math.sin(angle);

  const arcs = zones.map((z) => {
    const a0 = Math.PI - (z.from - min) / (max - min) * Math.PI;
    const a1 = Math.PI - (z.to - min) / (max - min) * Math.PI;
    const x0 = cx + r * Math.cos(a0), y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy - r * Math.sin(a1);
    const large = Math.abs(a0 - a1) > Math.PI ? 1 : 0;
    return `<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)}"
      fill="none" stroke="${z.color}" stroke-width="12" stroke-linecap="butt" />`;
  }).join("");

  return `<svg viewBox="0 0 ${w} ${h + 4}" width="${w}" height="${h + 4}" role="img" aria-label="Gauge value ${value}">
    ${arcs}
    <line x1="${cx}" y1="${cy}" x2="${needleX.toFixed(1)}" y2="${needleY.toFixed(1)}"
      stroke="var(--text-primary)" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="${cx}" cy="${cy}" r="4" fill="var(--text-primary)" />
  </svg>`;
}

// --- Yield curve line chart ---------------------------------------------------
export function yieldCurveSVG(points, { width = 320, height = 140 } = {}) {
  if (!points.length) return "";
  const padL = 34, padB = 22, padT = 10, padR = 10;
  const innerW = width - padL - padR, innerH = height - padT - padB;
  const values = points.map((p) => p.value);
  const min = Math.min(...values) - 0.15, max = Math.max(...values) + 0.15;
  const stepX = innerW / (points.length - 1);
  const xy = points.map((p, i) => {
    const x = padL + i * stepX;
    const y = padT + innerH - ((p.value - min) / (max - min)) * innerH;
    return { ...p, x, y };
  });
  const d = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const gridY = [0, 0.5, 1].map((t) => padT + innerH * t);
  const grid = gridY.map((y) => `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${width - padR}" y2="${y.toFixed(1)}" stroke="var(--gridline)" stroke-width="1" />`).join("");
  const dots = xy.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="var(--series-blue)" stroke="var(--surface-1)" stroke-width="2" />`).join("");
  const labels = xy.map((p) => `<text x="${p.x.toFixed(1)}" y="${height - 6}" text-anchor="middle" class="axis-label">${p.label}</text>`).join("");
  const lastLabel = `<text x="${xy[xy.length - 1].x.toFixed(1)}" y="${(xy[xy.length - 1].y - 10).toFixed(1)}" text-anchor="end" class="value-label">${points[points.length - 1].value.toFixed(2)}%</text>`;
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Yield curve">
    ${grid}
    <path d="${d}" fill="none" stroke="var(--series-blue)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    ${dots}
    ${labels}
    ${lastLabel}
  </svg>`;
}

// --- Meter (drift bar: current vs target) --------------------------------------
export function meterSVG(current, target, { width = 220, height = 10, color = "var(--series-blue)" } = {}) {
  const maxScale = Math.max(current, target, 1) * 1.25;
  const curW = Math.max(2, (current / maxScale) * width);
  const tgtX = (target / maxScale) * width;
  return `<svg viewBox="0 0 ${width} ${height + 4}" width="${width}" height="${height + 4}" role="img" aria-label="Current ${current}% vs target ${target}%">
    <rect x="0" y="0" width="${width}" height="${height}" rx="5" fill="var(--track)" />
    <rect x="0" y="0" width="${curW.toFixed(1)}" height="${height}" rx="5" fill="${color}" />
    <line x1="${tgtX.toFixed(1)}" y1="-2" x2="${tgtX.toFixed(1)}" y2="${height + 2}" stroke="var(--text-primary)" stroke-width="2" />
  </svg>`;
}
