/**
 * Local time for the spatial home's light. Sunrise and sunset are worked out from the town's
 * coordinates with the standard NOAA solar formulas (no network calls), and the clock reads the
 * America/New_York time zone, so the room turns golden at sunset and dark at night for whoever
 * visits, wherever they are. The UI labels it "Georgia time": the home town is never shown.
 */

export type Env = 'day' | 'sunset' | 'night';

const LAT = 34.207;
const LNG = -84.14;
export const TZ = 'America/New_York';

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Sunrise and sunset for a date, as Date objects (UTC instants). */
export function sunTimes(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86400000);
  const g = ((2 * Math.PI) / 365) * (day - 1 + 0.5);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ha = deg(Math.acos(Math.cos(rad(90.833)) / (Math.cos(rad(LAT)) * Math.cos(decl)) - Math.tan(rad(LAT)) * Math.tan(decl)));
  const noonUtcMin = 720 - 4 * LNG - eqtime;
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return {
    sunrise: new Date(midnight + (noonUtcMin - 4 * ha) * 60000),
    sunset: new Date(midnight + (noonUtcMin + 4 * ha) * 60000),
  };
}

/** Day, sunset (golden hour around sunrise and sunset) or night, for this moment. */
export function envNow(now = new Date()): Env {
  const { sunrise, sunset } = sunTimes(now);
  const t = now.getTime();
  const m = 60000;
  if (t < sunrise.getTime() - 25 * m || t > sunset.getTime() + 30 * m) return 'night';
  if (t < sunrise.getTime() + 45 * m || t > sunset.getTime() - 60 * m) return 'sunset';
  return 'day';
}

export const fmtTime = (d: Date, withSeconds = false) =>
  d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}) });

export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long', month: 'short', day: 'numeric' });
