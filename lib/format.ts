export function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function todayISODate(now = new Date()) {
  const y = now.getFullYear();
  const m = pad2(now.getMonth() + 1);
  const d = pad2(now.getDate());
  return `${y}-${m}-${d}`;
}

export function addDaysISODate(baseISODate: string, days: number) {
  const [y, m, d] = baseISODate.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return todayISODate(dt);
}

export function nowISODateTime(now = new Date()) {
  return now.toISOString();
}

export function shortDateLabel(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  return dt.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit' });
}

export function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371_000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
