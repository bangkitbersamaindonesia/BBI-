export function paymentDueDate(date, terms) {
  const term = String(terms ?? '').trim();
  const match = /^(?:net\s+(\d{1,3})|(\d{1,3})\s+hari(?:\s+setelah\s+bills?)?)$/i.exec(term);
  if (!match && !/^cash$/i.test(term)) return undefined;
  const day = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(day.getTime())) return undefined;
  day.setUTCDate(day.getUTCDate() + Number(match?.[1] ?? match?.[2] ?? 0));
  return day.toISOString().slice(0,10);
}
