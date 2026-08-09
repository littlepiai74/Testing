import { MARKET_SESSIONS } from "./config.js";

function partsFor(tz, now) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(now);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

export function getSessionStatuses(now = new Date()) {
  return MARKET_SESSIONS.map((session) => {
    const { hour, minute, weekday } = partsFor(session.tz, now);
    const h = parseInt(hour, 10), m = parseInt(minute, 10);
    const minutesNow = h * 60 + m;
    const openM = session.open[0] * 60 + session.open[1];
    const closeM = session.close[0] * 60 + session.close[1];
    const isWeekday = weekday !== "Sat" && weekday !== "Sun";
    const isOpen = isWeekday && minutesNow >= openM && minutesNow < closeM;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    return { ...session, isOpen, timeStr };
  });
}
