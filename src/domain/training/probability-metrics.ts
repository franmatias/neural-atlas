import { classificationMetrics } from './metrics';

export interface RankingPoint {
  /** null represents a threshold above every score: predict nobody positive. */
  threshold: number | null;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  tpr: number | null;
  fpr: number | null;
  precision: number;
  recall: number | null;
}
export function rankingMetrics(actual: number[], scores: number[]) {
  if (
    !actual.length ||
    actual.length !== scores.length ||
    actual.some((y) => y !== 0 && y !== 1) ||
    scores.some((p) => !Number.isFinite(p) || p < 0 || p > 1)
  )
    throw new RangeError('METRICS');
  const positives = actual.reduce((s, y) => s + y, 0),
    negatives = actual.length - positives;
  const order = scores
    .map((score, i) => ({ score, y: actual[i]! }))
    .sort((a, b) => b.score - a.score);
  let tp = 0,
    fp = 0;
  const point = (threshold: number | null): RankingPoint => ({
    threshold,
    tp,
    fp,
    tn: negatives - fp,
    fn: positives - tp,
    tpr: positives ? tp / positives : null,
    fpr: negatives ? fp / negatives : null,
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: positives ? tp / positives : null,
  });
  const points = [point(null)];
  for (let i = 0; i < order.length;) {
    const score = order[i]!.score;
    do {
      tp += order[i]!.y;
      fp += 1 - order[i]!.y;
      i++;
    } while (i < order.length && order[i]!.score === score);
    points.push(point(score));
  }
  let auc = 0,
    ap = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!;
    if (positives && negatives) auc += ((b.fpr! - a.fpr!) * (a.tpr! + b.tpr!)) / 2;
    if (positives) ap += (b.recall! - a.recall!) * b.precision;
  }
  return {
    positives,
    negatives,
    prevalence: positives / actual.length,
    points,
    auc: positives && negatives ? auc : null,
    ap: positives ? ap : null,
  };
}
export function probabilityMetrics(
  actual: number[],
  probabilities: number[][],
  classes: number,
  bins = 10,
) {
  if (!Number.isInteger(bins) || bins < 5 || bins > 20) throw new RangeError('METRICS');
  // Shared validation includes finite, normalized probabilities and valid target indices.
  classificationMetrics(actual, probabilities, classes);
  const binary = probabilities[0]!.length === 1;
  const vectors = probabilities.map((p) => (binary ? [1 - p[0]!, p[0]!] : p));
  const perClass = Array.from({ length: classes }, (_, c) => {
    const scores = vectors.map((p) => p[c]!),
      truth = actual.map((y) => Number(y === c));
    const buckets = Array.from({ length: bins }, (_, i) => ({
      lower: i / bins,
      upper: (i + 1) / bins,
      count: 0,
      sum: 0,
      positives: 0,
    }));
    scores.forEach((p, i) => {
      const bucket = buckets[Math.min(bins - 1, Math.floor(p * bins))]!;
      bucket.count++;
      bucket.sum += p;
      bucket.positives += truth[i]!;
    });
    return {
      ...rankingMetrics(truth, scores),
      brier: scores.reduce((s, p, i) => s + (p - truth[i]!) ** 2 / actual.length, 0),
      bins: buckets.map((b) => ({
        lower: b.lower,
        upper: b.upper,
        count: b.count,
        mean: b.count ? b.sum / b.count : null,
        frequency: b.count ? b.positives / b.count : null,
      })),
    };
  });
  const definedMean = (key: 'auc' | 'ap') => {
    const values = perClass.map((c) => c[key]).filter((v): v is number => v !== null);
    return {
      value: values.length ? values.reduce((s, v) => s + v / values.length, 0) : null,
      defined: values.length,
      excluded: classes - values.length,
    };
  };
  return {
    brier: binary ? perClass[1]!.brier : perClass.reduce((s, c) => s + c.brier, 0),
    convention: binary ? ('binary-scalar' as const) : ('multiclass-sum' as const),
    perClass,
    macroAuc: definedMean('auc'),
    macroAp: definedMean('ap'),
  };
}
export function validateCosts(costs: number[][], classes: number) {
  if (
    !Number.isInteger(classes) ||
    classes < 2 ||
    classes > 10 ||
    costs.length !== classes ||
    costs.some(
      (row) => row.length !== classes || row.some((v) => !Number.isFinite(v) || v < 0 || v > 1e6),
    )
  )
    throw new RangeError('COSTS');
}
export function decisionCost(matrix: number[][], costs: number[][]) {
  validateCosts(costs, matrix.length);
  if (
    matrix.some(
      (r) => r.length !== matrix.length || r.some((n) => !Number.isSafeInteger(n) || n < 0),
    )
  )
    throw new RangeError('COSTS');
  const n = matrix.flat().reduce((s, v) => s + v, 0);
  if (!n || !Number.isSafeInteger(n)) throw new RangeError('COSTS');
  return matrix.reduce(
    (s, row, i) => s + row.reduce((v, count, j) => v + count * costs[i]![j]!, 0) / n,
    0,
  );
}
export function bestCostThreshold(
  actual: number[],
  probabilities: number[][],
  positive: number,
  costs: number[][],
) {
  validateCosts(costs, 2);
  classificationMetrics(actual, probabilities, 2, 0.5, positive);
  const scores = probabilities.map((p) =>
    p.length === 1 ? (positive === 1 ? p[0]! : 1 - p[0]!) : p[positive]!,
  );
  const rank = rankingMetrics(
    actual.map((y) => Number(y === positive)),
    scores,
  );
  const cost = (p: RankingPoint) =>
    (p.tp * costs[positive]![positive]! +
      p.fn * costs[positive]![1 - positive]! +
      p.fp * costs[1 - positive]![positive]! +
      p.tn * costs[1 - positive]![1 - positive]!) /
    actual.length;
  const candidates = rank.points.slice(1).map((p) => ({ threshold: p.threshold!, cost: cost(p) }));
  if (rank.points.at(-1)!.threshold !== 0)
    candidates.push({ threshold: 0, cost: cost(rank.points.at(-1)!) });
  if (rank.points[1]!.threshold! < 1)
    candidates.push({ threshold: 1, cost: cost(rank.points[0]!) });
  candidates.sort((a, b) => a.cost - b.cost || b.threshold - a.threshold);
  return { ...candidates[0]!, candidates: candidates.length };
}
