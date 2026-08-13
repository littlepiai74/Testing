// Instrument universe, MPF allocation targets, sector list, and alert thresholds.
// Baseline levels are illustrative anchors for the simulation engine, not live quotes.
// Recalibrate them (or better, stop using them) once a real feed is wired in — see providers/localProxy.js.

export const REGIONS = {
  APAC: "Asia-Pacific",
  EUROPE: "Europe",
  AMERICAS: "Americas",
};

// id must match a real ticker for providers that fetch live data (Stooq-style symbol in `feedSymbol`).
export const INDICES = [
  { id: "hsi", name: "Hang Seng Index", region: REGIONS.APAC, market: "Hong Kong", baseline: 25100, vol: 0.011, decimals: 0, feedSymbol: "^hsi" },
  { id: "hscei", name: "Hang Seng China Ent.", region: REGIONS.APAC, market: "Hong Kong", baseline: 9050, vol: 0.013, decimals: 0, feedSymbol: "^hscei" },
  { id: "hstech", name: "Hang Seng TECH", region: REGIONS.APAC, market: "Hong Kong", baseline: 5480, vol: 0.017, decimals: 0, feedSymbol: "^hstech" },
  { id: "sse", name: "Shanghai Composite", region: REGIONS.APAC, market: "China", baseline: 3410, vol: 0.010, decimals: 0, feedSymbol: "^shc" },
  { id: "csi300", name: "CSI 300", region: REGIONS.APAC, market: "China", baseline: 4120, vol: 0.011, decimals: 0, feedSymbol: "^csi300" },
  { id: "n225", name: "Nikkei 225", region: REGIONS.APAC, market: "Japan", baseline: 42300, vol: 0.012, decimals: 0, feedSymbol: "^nkx" },
  { id: "kospi", name: "KOSPI", region: REGIONS.APAC, market: "S. Korea", baseline: 2910, vol: 0.013, decimals: 0, feedSymbol: "^kospi" },
  { id: "asx200", name: "ASX 200", region: REGIONS.APAC, market: "Australia", baseline: 8620, vol: 0.008, decimals: 0, feedSymbol: "^axjo" },
  { id: "sti", name: "STI", region: REGIONS.APAC, market: "Singapore", baseline: 3920, vol: 0.007, decimals: 0, feedSymbol: "^sti" },
  { id: "sensex", name: "SENSEX", region: REGIONS.APAC, market: "India", baseline: 84200, vol: 0.010, decimals: 0, feedSymbol: "^bsesn" },
  { id: "ftse", name: "FTSE 100", region: REGIONS.EUROPE, market: "UK", baseline: 8640, vol: 0.008, decimals: 0, feedSymbol: "^ftse" },
  { id: "dax", name: "DAX", region: REGIONS.EUROPE, market: "Germany", baseline: 19550, vol: 0.010, decimals: 0, feedSymbol: "^gdaxi" },
  { id: "cac", name: "CAC 40", region: REGIONS.EUROPE, market: "France", baseline: 8080, vol: 0.010, decimals: 0, feedSymbol: "^fchi" },
  { id: "sx5e", name: "Euro Stoxx 50", region: REGIONS.EUROPE, market: "Eurozone", baseline: 5320, vol: 0.010, decimals: 0, feedSymbol: "^stoxx50e" },
  { id: "spx", name: "S&P 500", region: REGIONS.AMERICAS, market: "US", baseline: 6420, vol: 0.010, decimals: 0, feedSymbol: "^spx" },
  { id: "djia", name: "Dow Jones", region: REGIONS.AMERICAS, market: "US", baseline: 44650, vol: 0.008, decimals: 0, feedSymbol: "^dji" },
  { id: "ndx", name: "Nasdaq 100", region: REGIONS.AMERICAS, market: "US", baseline: 23100, vol: 0.014, decimals: 0, feedSymbol: "^ndx" },
  { id: "tsx", name: "TSX Composite", region: REGIONS.AMERICAS, market: "Canada", baseline: 25600, vol: 0.008, decimals: 0, feedSymbol: "^gsptse" },
];

export const RATES = [
  { id: "us2y", name: "US 2Y Yield", baseline: 3.78, vol: 0.012, decimals: 2, unit: "%" },
  { id: "us10y", name: "US 10Y Yield", baseline: 4.32, vol: 0.010, decimals: 2, unit: "%" },
  { id: "us30y", name: "US 30Y Yield", baseline: 4.61, vol: 0.008, decimals: 2, unit: "%" },
  { id: "bund10y", name: "German Bund 10Y", baseline: 2.48, vol: 0.010, decimals: 2, unit: "%" },
  { id: "jgb10y", name: "JGB 10Y", baseline: 1.34, vol: 0.014, decimals: 2, unit: "%" },
  { id: "hibor1m", name: "HIBOR 1M", baseline: 3.52, vol: 0.006, decimals: 2, unit: "%" },
  { id: "hibor3m", name: "HIBOR 3M", baseline: 3.61, vol: 0.006, decimals: 2, unit: "%" },
];

export const FX = [
  { id: "dxy", name: "DXY Dollar Index", baseline: 101.4, vol: 0.004, decimals: 2 },
  { id: "eurusd", name: "EUR/USD", baseline: 1.092, vol: 0.005, decimals: 4 },
  { id: "gbpusd", name: "GBP/USD", baseline: 1.281, vol: 0.005, decimals: 4 },
  { id: "usdjpy", name: "USD/JPY", baseline: 152.4, vol: 0.006, decimals: 2 },
  { id: "usdcnh", name: "USD/CNH", baseline: 7.152, vol: 0.003, decimals: 3 },
  { id: "usdhkd", name: "USD/HKD", baseline: 7.800, vol: 0.0006, decimals: 4, pegBand: [7.75, 7.85] },
];

export const COMMODITIES = [
  { id: "gold", name: "Gold (Spot)", baseline: 2465, vol: 0.008, decimals: 1, unit: "$/oz" },
  { id: "silver", name: "Silver (Spot)", baseline: 29.4, vol: 0.014, decimals: 2, unit: "$/oz" },
  { id: "brent", name: "Brent Crude", baseline: 82.3, vol: 0.013, decimals: 2, unit: "$/bbl" },
  { id: "wti", name: "WTI Crude", baseline: 78.1, vol: 0.014, decimals: 2, unit: "$/bbl" },
  { id: "copper", name: "Copper", baseline: 4.31, vol: 0.011, decimals: 3, unit: "$/lb" },
];

export const VOLATILITY = [
  { id: "vix", name: "VIX", baseline: 15.2, vol: 0.05, decimals: 2, thresholds: { warning: 20, critical: 28 } },
  { id: "vhsi", name: "VHSI (HK Vol)", baseline: 18.6, vol: 0.045, decimals: 2, thresholds: { warning: 24, critical: 32 } },
];

// Option-adjusted spreads over Treasuries, in basis points. Widening spreads signal credit stress.
export const CREDIT = [
  { id: "igoas", name: "US IG OAS", baseline: 92, vol: 0.012, decimals: 0, unit: "bp", thresholds: { warning: 130, critical: 170 } },
  { id: "hyoas", name: "US HY OAS", baseline: 305, vol: 0.018, decimals: 0, unit: "bp", thresholds: { warning: 420, critical: 550 } },
  { id: "emoas", name: "EM Sovereign OAS", baseline: 245, vol: 0.015, decimals: 0, unit: "bp", thresholds: { warning: 350, critical: 450 } },
];

export const SECTORS = [
  "Financials", "Technology", "Real Estate", "Energy", "Materials",
  "Utilities", "Cons. Discretionary", "Cons. Staples", "Healthcare",
  "Industrials", "Telecom",
];

// Hypothetical CIO benchmark: MPF Mixed Asset Fund (growth-tilted), target strategic weights.
export const MPF_ALLOCATION_TARGET = [
  { id: "hkchina", label: "HK / China Equity", value: 20, class: "equity" },
  { id: "asiaexjp", label: "Asia ex-Japan Equity", value: 15, class: "equity" },
  { id: "global", label: "Global / US Equity", value: 25, class: "equity" },
  { id: "europe", label: "Europe Equity", value: 5, class: "equity" },
  { id: "japan", label: "Japan Equity", value: 5, class: "equity" },
  { id: "bonds", label: "Global Bonds", value: 25, class: "bond" },
  { id: "cash", label: "Cash & Money Market", value: 5, class: "cash" },
];

export const ALERT_RULES = {
  driftWarning: 2.5, // percentage points off target weight
  driftCritical: 5,
  indexMoveWarning: 1.5, // % daily move
  indexMoveCritical: 3,
  yieldCurveInvertWarning: 0.10, // 10Y-2Y spread (pp) below which "flat" warning fires
  creditWideningNotable: 15, // bp single-tick widening treated as notable
};

export const MARKET_SESSIONS = [
  { id: "tokyo", name: "Tokyo", tz: "Asia/Tokyo", open: [9, 0], close: [15, 0] },
  { id: "hongkong", name: "Hong Kong", tz: "Asia/Hong_Kong", open: [9, 30], close: [16, 0] },
  { id: "london", name: "London", tz: "Europe/London", open: [8, 0], close: [16, 30] },
  { id: "newyork", name: "New York", tz: "America/New_York", open: [9, 30], close: [16, 0] },
];

export const REFRESH_INTERVAL_MS = 4000;
