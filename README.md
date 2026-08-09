# Global Markets Command Center — MPF Mixed Asset Fund CIO Dashboard

A single-page, real-time-style market monitoring dashboard built for the CIO of
a Mandatory Provident Fund (MPF) mixed-asset fund: global equity indices,
rates, FX (including the HKD Linked Exchange Rate / peg band), commodities,
volatility, a strategic asset-allocation view, a sector heatmap, and a
rule-based alert feed — all on one screen, refreshing continuously.

No build step, no framework, no npm install required to view it.

![theme](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20SVG-2a78d6)

## Quick start

```bash
# Option A — zero dependencies, includes the live-quote proxy
node server.js            # serves http://localhost:8080

# Option B — pure static file server (simulated data only, no proxy)
python3 -m http.server 8080
# or: npx serve .
```

Then open `http://localhost:8080`. That's it — the dashboard starts ticking
immediately with a simulated feed and upgrades itself to live data
automatically if `server.js` is running and reachable (see below).

## What's actually "real-time" here

Be precise about this with your risk/compliance team before anyone treats this
as a trading or valuation tool:

1. **Default mode — simulated.** `js/providers/simulate.js` runs a
   mean-reverting random walk per instrument, seeded from illustrative
   baseline levels in `js/config.js`. It updates every 4 seconds, looks and
   moves like a live tape, and is clearly labeled **SIMULATED** in the header
   status pill and the footer. This is the zero-config default so the
   dashboard is fully usable with no vendor contract and no API key.
2. **Optional — proxied delayed quotes.** If you run `node server.js`, the
   frontend polls `GET /api/quotes` on the same origin, which the server
   proxies to Stooq's free CSV endpoint (no key, but ~15–20 min delayed and
   not a licensed redistribution source — fine for internal dev/demo, not for
   a production CIO desk). When this works, the header shows **LIVE (proxy
   feed)** and price levels are steered toward the real prints while keeping
   smooth tick-by-tick motion.
3. **Production — bring your own licensed feed.** There is no free, reliable,
   redistribution-safe, real-time source for global indices/FX/rates. For a
   real CIO monitoring desk, replace `fetchQuotesFromUpstream()` in
   `server.js` with a call into your Bloomberg B-PIPE / Refinitiv (LSEG) Data
   Platform / ICE feed (usually via an internal market-data gateway your
   infra team runs), or a licensed vendor API (Polygon.io, Finnhub, Twelve
   Data). Keep the response shape `{ ok: true, quotes: [{ symbol, price,
   prevClose, time }] }` and the frontend needs no changes.

The dashboard is architected so this swap is the *only* thing that changes —
UI, alerting, and layout are independent of where the numbers come from.

## Architecture

```
index.html            Page shell — header, KPI strip, panel grid, footer
css/dashboard.css      Design tokens (light/dark) + layout + components
js/config.js           Instrument universe, MPF allocation targets, alert thresholds
js/dataService.js      Orchestrates providers, polls on an interval, publishes ticks
js/providers/
  simulate.js           Default: mean-reverting random-walk engine
  localProxy.js          Talks to /api/quotes on server.js, degrades to nothing if absent
js/charts.js            Inline-SVG chart primitives: sparkline, donut, gauge, yield curve, meter
js/sessions.js          Tokyo / Hong Kong / London / New York open-closed clock
js/alerts.js            Rule engine: vol spikes, index moves, HKD peg watch,
                         yield curve inversion, allocation drift
js/app.js               Rendering + wiring — subscribes to dataService, redraws panels
server.js               Optional zero-dependency static server + quote proxy
```

No charting library is used — every chart is hand-drawn inline SVG following a
small, consistent mark spec (2px lines, 8px+ dot targets, hairline gridlines,
a fixed 8-color categorical palette, blue↔red diverging scale for
over/under-performance, green/red only for signed deltas). Colors are CSS
custom properties (`css/dashboard.css`) so light/dark theming is one set of
token swaps, not per-chart logic.

## Panels

- **Header** — HKT + local clock, Tokyo/HK/London/NY session status, data
  source pill (LIVE proxy vs SIMULATED), theme toggle.
- **KPI strip** — HSI, S&P 500, VIX, US 10Y yield, USD/HKD, and an equal-weight
  Asia-Pacific equity composite.
- **Regional index panels** — Asia-Pacific / Europe / Americas, each row with
  level, change, change %, and a 48-tick sparkline.
- **Fixed Income & Rates** — US 2Y/10Y/30Y curve chart, German Bund 10Y, JGB
  10Y, HIBOR 1M/3M.
- **FX** — DXY, EUR/USD, GBP/USD, USD/JPY, USD/CNH, USD/HKD with a visual
  Linked Exchange Rate (peg) band indicator.
- **Commodities** — Gold, Silver, Brent, WTI, Copper.
- **Volatility & Risk** — VIX and VHSI semicircular gauges with
  calm/elevated/stress zones.
- **MPF Allocation Mix** — donut of current weights against a hypothetical
  growth-tilted MPF mixed-asset strategic allocation (edit
  `MPF_ALLOCATION_TARGET` in `js/config.js` to match your actual fund).
- **Allocation Drift** — current vs. target weight per asset class, with a
  target-line meter.
- **Sector Heatmap** — illustrative regional sector performance.
- **Alerts & Risk Feed** — auto-generated from `js/alerts.js` rules every
  tick: VIX/VHSI thresholds, ±1.5%/±3% index moves, HKD peg-edge proximity,
  10Y-2Y curve inversion/flattening, and allocation drift bands.

## Configuring it for your fund

Everything instrument- and fund-specific lives in `js/config.js`:

- `INDICES`, `RATES`, `FX`, `COMMODITIES`, `VOLATILITY` — the instrument
  universe and simulation baselines/volatility.
- `MPF_ALLOCATION_TARGET` — your fund's actual strategic asset allocation.
- `ALERT_RULES` — drift and move thresholds.
- `MARKET_SESSIONS` — trading hours per venue (approximate; does not account
  for exchange holidays).
- `REFRESH_INTERVAL_MS` — tick cadence (default 4s).

## Notes / limitations

- Market session open/closed logic uses standard hours only — it does not
  know about exchange holidays.
- The allocation "current" weights and sector heatmap are simulated drift for
  demonstration; wire them to your actual portfolio accounting / risk system
  for production use.
- This is a monitoring display, not a trading or order-management system, and
  carries no execution capability by design.
