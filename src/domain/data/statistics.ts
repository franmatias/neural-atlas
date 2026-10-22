import { DataError } from './types';
export function quantile(sorted: readonly number[], p: number): number {
  if (!sorted.length) throw new DataError('ALL_MISSING');
  const position = (sorted.length - 1) * p;
  const index = Math.floor(position);
  return (
    sorted[index]! +
    (sorted[Math.min(index + 1, sorted.length - 1)]! - sorted[index]!) * (position - index)
  );
}
export function numericStatistics(values: readonly number[]) {
  if (!values.length) throw new DataError('ALL_MISSING');
  let mean = 0;
  let m2 = 0;
  let n = 0;
  for (const value of values) {
    n++;
    const delta = value - mean;
    mean += delta / n;
    m2 += delta * (value - mean);
  }
  const sorted = [...values].sort((a, b) => a - b);
  const variance = Math.max(0, m2 / n);
  if (![mean, variance].every(Number.isFinite)) throw new DataError('NON_FINITE');
  return {
    count: n,
    mean,
    std: Math.sqrt(variance),
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    median: quantile(sorted, 0.5),
  };
}
export function mode<T extends number | string>(values: readonly T[]): T {
  if (!values.length) throw new DataError('ALL_MISSING');
  const counts = new Map<T, number>();
  let best = values[0]!;
  let max = 0;
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const [value, count] of counts)
    if (count > max) {
      best = value;
      max = count;
    }
  return best;
}
