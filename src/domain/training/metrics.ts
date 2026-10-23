import { assertFinite } from '@/domain/network/model';
export interface ClassMetric {
  support: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
}
export function classificationMetrics(
  actual: number[],
  probabilities: number[][],
  classes: number,
  threshold = 0.5,
  positive = 1,
) {
  if (
    !actual.length ||
    actual.length !== probabilities.length ||
    !Number.isInteger(classes) ||
    classes < 2 ||
    classes > 10 ||
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 1 ||
    !Number.isInteger(positive) ||
    positive < 0 ||
    positive >= classes
  )
    throw new RangeError('METRICS');
  const binary = classes === 2 && probabilities[0]?.length === 1;
  const predicted = probabilities.map((p) => {
    assertFinite(p);
    if (
      p.length !== (binary ? 1 : classes) ||
      p.some((v) => v < 0 || v > 1) ||
      (!binary && Math.abs(p.reduce((sum, value) => sum + value, 0) - 1) > 1e-8)
    )
      throw new RangeError('METRICS');
    return binary
      ? Number((positive === 1 ? p[0]! : 1 - p[0]!) >= threshold) === 1
        ? positive
        : 1 - positive
      : p.indexOf(Math.max(...p));
  });
  const matrix = Array.from({ length: classes }, () => Array<number>(classes).fill(0));
  actual.forEach((y, i) => {
    if (!Number.isInteger(y) || y < 0 || y >= classes) throw new RangeError('METRICS');
    matrix[y]![predicted[i]!]!++;
  });
  const divide = (a: number, b: number) => (b === 0 ? null : a / b);
  const perClass: ClassMetric[] = matrix.map((row, c) => {
    const tp = row[c]!,
      support = row.reduce((a, b) => a + b, 0),
      fp = matrix.reduce((n, r) => n + r[c]!, 0) - tp,
      fn = support - tp,
      tn = actual.length - tp - fp - fn;
    return {
      support,
      tp,
      fp,
      tn,
      fn,
      precision: divide(tp, tp + fp),
      recall: divide(tp, tp + fn),
      f1: divide(2 * tp, 2 * tp + fp + fn),
    };
  });
  const macro = perClass.reduce((s, c) => s + (c.f1 ?? 0) / classes, 0),
    weighted = perClass.reduce((s, c) => s + ((c.f1 ?? 0) * c.support) / actual.length, 0);
  return {
    matrix,
    predicted,
    perClass,
    accuracy: actual.reduce((s, y, i) => s + Number(y === predicted[i]), 0) / actual.length,
    macroF1: macro,
    weightedF1: weighted,
    undefinedMetrics: perClass.some(
      (c) => c.precision === null || c.recall === null || c.f1 === null,
    ),
  };
}
export function regressionMetrics(actual: number[], predicted: number[], baseline: number) {
  if (!actual.length || actual.length !== predicted.length || !Number.isFinite(baseline))
    throw new RangeError('METRICS');
  assertFinite(actual);
  assertFinite(predicted);
  let mse = 0,
    mae = 0,
    baselineMse = 0,
    baselineMae = 0,
    variance = 0;
  const mean = actual.reduce((sum, value) => sum + value / actual.length, 0);
  const residuals = actual.map((y, i) => {
    const r = y - predicted[i]!;
    mse += (r * r) / actual.length;
    mae += Math.abs(r) / actual.length;
    baselineMse += (y - baseline) ** 2 / actual.length;
    baselineMae += Math.abs(y - baseline) / actual.length;
    variance += (y - mean) ** 2 / actual.length;
    return r;
  });
  assertFinite([mse, mae, baselineMse, baselineMae, variance]);
  return {
    mse,
    mae,
    rmse: Math.sqrt(mse),
    baselineMse,
    baselineMae,
    r2: variance === 0 ? null : 1 - mse / variance,
    residuals,
  };
}
