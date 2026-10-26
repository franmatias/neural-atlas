import { classificationMetrics } from './metrics';
import { safeId } from '@/domain/data/validation';
export const auditGroups = ['G1', 'G2'] as const;
export type AuditGroup = (typeof auditGroups)[number];
export interface AuditRow {
  id: string;
  group: AuditGroup;
  actual: number;
  score: number;
  measurement: number;
}
export type AuditThresholds = Record<AuditGroup, number>;
export type AuditCosts = Record<AuditGroup, { fp: number; fn: number }>;
export interface AuditMetrics {
  n: number;
  positives: number;
  negatives: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  matrix: number[][];
  accuracy: number | null;
  prevalence: number | null;
  selection: number | null;
  precision: number | null;
  recall: number | null;
  fpr: number | null;
  fnr: number | null;
  totalCost: number;
  meanCost: number | null;
}
const divide = (n: number, d: number) => (d === 0 ? null : n / d);
function measures(matrix: number[][], totalCost: number): AuditMetrics {
  const tn = matrix[0]![0]!,
    fp = matrix[0]![1]!,
    fn = matrix[1]![0]!,
    tp = matrix[1]![1]!;
  const positives = tp + fn,
    negatives = tn + fp,
    n = positives + negatives;
  return {
    n,
    positives,
    negatives,
    tp,
    fp,
    tn,
    fn,
    matrix,
    accuracy: divide(tp + tn, n),
    prevalence: divide(positives, n),
    selection: divide(tp + fp, n),
    precision: divide(tp, tp + fp),
    recall: divide(tp, positives),
    fpr: divide(fp, negatives),
    fnr: divide(fn, positives),
    totalCost,
    meanCost: divide(totalCost, n),
  };
}
function validateRows(rows: AuditRow[]) {
  const ids = new Set<string>();
  if (rows.length > 800) throw new RangeError('AUDIT_ROWS');
  for (const row of rows) {
    if (
      !safeId(row.id) ||
      ids.has(row.id) ||
      !auditGroups.includes(row.group) ||
      (row.actual !== 0 && row.actual !== 1) ||
      !Number.isFinite(row.score) ||
      row.score < 0 ||
      row.score > 1 ||
      !Number.isFinite(row.measurement)
    )
      throw new RangeError('AUDIT_ROWS');
    ids.add(row.id);
  }
}
function validatePolicy(thresholds: AuditThresholds, costs: AuditCosts) {
  for (const group of auditGroups) {
    const t = thresholds[group],
      c = costs[group];
    if (!Number.isFinite(t) || t < 0 || t > 1) throw new RangeError('AUDIT_THRESHOLD');
    if (!c || [c.fp, c.fn].some((v) => !Number.isFinite(v) || v < 0 || v > 20))
      throw new RangeError('AUDIT_COST');
  }
}
function summarize(rows: AuditRow[], thresholds: AuditThresholds, costs: AuditCosts) {
  const groupMetrics = (group: AuditGroup) => {
    const selected = rows.filter((r) => r.group === group);
    const matrix = selected.length
      ? classificationMetrics(
          selected.map((r) => r.actual),
          selected.map((r) => [r.score]),
          2,
          thresholds[group],
          1,
        ).matrix
      : [
          [0, 0],
          [0, 0],
        ];
    return measures(matrix, matrix[0]![1]! * costs[group].fp + matrix[1]![0]! * costs[group].fn);
  };
  const groups = { G1: groupMetrics('G1'), G2: groupMetrics('G2') };
  const matrix = groups.G1.matrix.map((r, i) => r.map((v, j) => v + groups.G2.matrix[i]![j]!));
  const gap = (key: 'accuracy' | 'selection' | 'precision' | 'recall' | 'fpr' | 'fnr') =>
    groups.G1[key] === null || groups.G2[key] === null ? null : groups.G2[key]! - groups.G1[key]!;
  return {
    groups,
    overall: measures(matrix, groups.G1.totalCost + groups.G2.totalCost),
    gaps: {
      accuracy: gap('accuracy'),
      selection: gap('selection'),
      precision: gap('precision'),
      recall: gap('recall'),
      fpr: gap('fpr'),
      fnr: gap('fnr'),
    },
  };
}
export function compareGroupPolicies(
  rows: AuditRow[],
  reference: AuditThresholds,
  alternative: AuditThresholds,
  costs: AuditCosts,
) {
  validateRows(rows);
  validatePolicy(reference, costs);
  validatePolicy(alternative, costs);
  const changes = rows.map((row) => ({
    id: row.id,
    group: row.group,
    actual: row.actual,
    score: row.score,
    reference: Number(row.score >= reference[row.group]),
    alternative: Number(row.score >= alternative[row.group]),
  }));
  const transitions = (selected: typeof changes) => ({
    toPositive: selected.filter((r) => r.reference === 0 && r.alternative === 1).length,
    toNegative: selected.filter((r) => r.reference === 1 && r.alternative === 0).length,
    errorsFixed: selected.filter((r) => r.reference !== r.actual && r.alternative === r.actual)
      .length,
    errorsIntroduced: selected.filter((r) => r.reference === r.actual && r.alternative !== r.actual)
      .length,
  });
  return {
    reference: summarize(rows, reference, costs),
    alternative: summarize(rows, alternative, costs),
    changes,
    transitions: {
      overall: transitions(changes),
      G1: transitions(changes.filter((r) => r.group === 'G1')),
      G2: transitions(changes.filter((r) => r.group === 'G2')),
    },
  };
}
export function auditHistogram(rows: AuditRow[], group: AuditGroup) {
  validateRows(rows);
  if (!auditGroups.includes(group)) throw new RangeError('AUDIT_GROUP');
  const bins = Array.from({ length: 10 }, (_, i) => ({
    lower: i / 10,
    upper: (i + 1) / 10,
    zero: 0,
    one: 0,
  }));
  for (const row of rows.filter((r) => r.group === group))
    bins[Math.min(9, Math.floor(row.score * 10))]![row.actual === 1 ? 'one' : 'zero']++;
  return bins;
}
