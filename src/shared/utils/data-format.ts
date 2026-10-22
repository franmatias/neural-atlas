import { formatNumber } from './decimal';
export function formatData(value: number | string | null): string {
  if (value === null) return '∅';
  if (typeof value === 'string') return value.length > 64 ? `${value.slice(0, 64)}…` : value;
  return Math.abs(value) >= 1e6 || (value !== 0 && Math.abs(value) < 0.0001)
    ? value.toExponential(2).replace('.', ',')
    : formatNumber(value, 4);
}
