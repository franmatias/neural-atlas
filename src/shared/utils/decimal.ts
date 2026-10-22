export type ParsedDecimal = { ok: true; value: number } | { ok: false; reason: 'syntax' | 'range' };
export function parseDecimal(raw: string, min = -Infinity, max = Infinity): ParsedDecimal {
  const text = raw.trim().replace(/−/g, '-');
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(text)) return { ok: false, reason: 'syntax' };
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value)) return { ok: false, reason: 'syntax' };
  if (value < min || value > max) return { ok: false, reason: 'range' };
  return { ok: true, value: Object.is(value, -0) ? 0 : value };
}
export function formatNumber(value: number, digits = 4, locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits, useGrouping: false }).format(Object.is(value, -0) ? 0 : value);
}
