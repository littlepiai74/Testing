#!/usr/bin/env node
// Zero-dependency static file server + a thin CORS-safe proxy for live quotes.
//
// Run:  node server.js [port]     (defaults to 8080)
//
// The dashboard (js/providers/localProxy.js) polls GET /api/quotes?symbols=a,b,c
// on this same origin, so no browser CORS problem exists regardless of what the
// upstream vendor allows. If this server isn't running, or the upstream call
// fails, the dashboard silently falls back to its simulated feed — nothing breaks.
//
// ---------------------------------------------------------------------------
// WIRING A REAL FEED
// ---------------------------------------------------------------------------
// `fetchQuotesFromUpstream()` below is the one function to replace. The default
// implementation calls Stooq's free delayed-quote CSV endpoint (no key required,
// but delayed ~15-20 min and not a licensed redistribution feed — demo/dev use
// only). For a CIO-grade production deployment, swap it for a licensed vendor:
//
//   - Institutional real-time: Bloomberg B-PIPE / Refinitiv (LSEG) Data Platform /
//     ICE Data Services. These are typically consumed via an internal market-data
//     gateway your infra team already runs — point this proxy at that gateway's
//     REST/WebSocket API instead of Stooq.
//   - Retail-friendly real-time (US equities mainly, indices/FX often still
//     delayed on free tiers): Polygon.io, Finnhub, Twelve Data, IEX Cloud.
//   - Whatever you use, keep the response shape this file returns:
//       { ok: true, quotes: [{ symbol, price, prevClose, time }] }
//     so the frontend needs zero changes.
//
// Real-time global index/FX data is generally a paid, licensed product — there
// is no free, reliable, real-time, redistribution-safe source for a fund's
// production monitoring desk. Budget for a vendor before go-live.
// ---------------------------------------------------------------------------

import http from "node:http";
import https from "node:https";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2]) || Number(process.env.PORT) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

function httpsGet(url, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`Upstream HTTP ${res.statusCode}`));
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("timeout", () => req.destroy(new Error("Upstream timeout")));
    req.on("error", reject);
  });
}

// Default adapter: Stooq CSV. Replace this function to swap vendors (see notes above).
async function fetchQuotesFromUpstream(symbols) {
  const csv = await httpsGet(
    `https://stooq.com/q/l/?s=${encodeURIComponent(symbols.join(","))}&f=sd2t2ohlc&h&e=csv`
  );
  const lines = csv.trim().split("\n").slice(1); // drop header row
  return lines.map((line) => {
    const [symbol, , , , open, , , close] = line.split(",");
    const price = parseFloat(close);
    const prevClose = parseFloat(open); // best-effort; swap for a real prevClose field from your vendor
    return { symbol: symbol.toLowerCase(), price, prevClose, time: Date.now() };
  }).filter((q) => isFinite(q.price));
}

async function handleQuotes(req, res, query) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (query.get("probe") === "1") {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const symbolsParam = query.get("symbols");
  if (!symbolsParam) {
    res.writeHead(400);
    res.end(JSON.stringify({ ok: false, error: "missing symbols" }));
    return;
  }

  try {
    const symbols = symbolsParam.split(",").filter(Boolean);
    const quotes = await fetchQuotesFromUpstream(symbols);
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, quotes }));
  } catch (err) {
    res.writeHead(502);
    res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
  }
}

async function serveStatic(req, res, pathname) {
  let filePath = path.join(__dirname, pathname === "/" ? "/index.html" : pathname);
  if (!filePath.startsWith(__dirname) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath);
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end("Server error");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/quotes") {
    await handleQuotes(req, res, url.searchParams);
    return;
  }
  await serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`MPF dashboard: http://localhost:${PORT}`);
  console.log(`Quote proxy:   http://localhost:${PORT}/api/quotes?symbols=^spx,^hsi`);
});
