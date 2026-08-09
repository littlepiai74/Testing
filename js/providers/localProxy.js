// Optional live-quote provider: talks to the zero-dependency proxy in server.js
// (`GET /api/quotes?symbols=a,b,c`). Only active when that server is actually running —
// this file degrades to "unavailable" cleanly so the caller falls back to simulation.
//
// server.js proxies a free delayed quote source by default; swap ADAPTER inside server.js
// to point at a licensed real-time vendor (see README "Wiring a real feed").

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function probeLocalProxy(timeoutMs = 2500) {
  try {
    const data = await fetchWithTimeout("/api/quotes?probe=1", timeoutMs);
    return !!data && data.ok === true;
  } catch {
    return false;
  }
}

export async function fetchQuotes(instruments, timeoutMs = 4000) {
  const symbols = instruments.map((i) => i.feedSymbol || i.id).join(",");
  const data = await fetchWithTimeout(`/api/quotes?symbols=${encodeURIComponent(symbols)}`, timeoutMs);
  if (!data || !Array.isArray(data.quotes)) throw new Error("Malformed proxy response");
  return data.quotes; // [{ symbol, price, prevClose, time }]
}
