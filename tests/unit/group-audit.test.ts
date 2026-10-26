import { it, expect } from 'vitest';
import {
  compareGroupPolicies,
  auditHistogram,
  type AuditRow,
  type AuditCosts,
} from '@/domain/training/group-audit';
import {
  generateAuditCohort,
  defaultAuditScenario,
  auditPresets,
  analyzeAudit,
  defaultAuditSettings,
  exportAuditReport,
} from '@/application/training/group-audit';
import { hashValue } from '@/domain/data/integrity';
const rows: AuditRow[] = [
  { id: 'a', group: 'G1', actual: 0, score: 0.1, measurement: 0 },
  { id: 'b', group: 'G1', actual: 0, score: 0.8, measurement: 0 },
  { id: 'c', group: 'G1', actual: 1, score: 0.3, measurement: 0 },
  { id: 'd', group: 'G1', actual: 1, score: 0.9, measurement: 0 },
  { id: 'e', group: 'G2', actual: 0, score: 0.4, measurement: 0 },
  { id: 'f', group: 'G2', actual: 1, score: 0.6, measurement: 0 },
];
const costs: AuditCosts = { G1: { fp: 1, fn: 5 }, G2: { fp: 2, fn: 8 } };
const same = { G1: 0.5, G2: 0.5 };
it('oráculo manual: matrices, tasas y agregado ponderado, sin promediar porcentajes de grupos', () => {
  const r = compareGroupPolicies(rows, same, same, costs).reference;
  expect(r.groups.G1.matrix).toEqual([
    [1, 1],
    [1, 1],
  ]);
  expect(r.groups.G2.matrix).toEqual([
    [1, 0],
    [0, 1],
  ]);
  expect(r.overall.matrix).toEqual([
    [2, 1],
    [1, 2],
  ]);
  expect(r.groups.G1).toMatchObject({
    n: 4,
    positives: 2,
    negatives: 2,
    accuracy: 0.5,
    selection: 0.5,
    precision: 0.5,
    recall: 0.5,
    fpr: 0.5,
    fnr: 0.5,
    totalCost: 6,
    meanCost: 1.5,
  });
  expect(r.overall.accuracy).toBe(4 / 6);
  expect(r.overall.accuracy).not.toBe(0.75);
  expect(r.overall.meanCost).toBe(1);
  expect(r.gaps).toMatchObject({ accuracy: 0.5, selection: 0, recall: 0.5, fpr: -0.5 });
});
it('misma exactitud global puede ocultar cambios opuestos y costes diferentes', () => {
  const r = compareGroupPolicies(rows, same, { G1: 0.2, G2: 0.2 }, costs);
  expect(r.alternative.overall.accuracy).toBe(r.reference.overall.accuracy);
  expect(r.alternative.groups.G1.accuracy).toBe(0.75);
  expect(r.alternative.groups.G2.accuracy).toBe(0.5);
  expect(r.alternative.overall.totalCost).toBe(3);
  expect(r.alternative.overall.meanCost).toBe(0.5);
  expect(r.transitions).toEqual({
    overall: { toPositive: 2, toNegative: 0, errorsFixed: 1, errorsIntroduced: 1 },
    G1: { toPositive: 1, toNegative: 0, errorsFixed: 1, errorsIntroduced: 0 },
    G2: { toPositive: 1, toNegative: 0, errorsFixed: 0, errorsIntroduced: 1 },
  });
  expect(r.alternative.gaps).toMatchObject({ selection: 0.25, recall: 0, fpr: 0.5 });
  expect(r.changes.find((r) => r.id === 'c')).toMatchObject({ reference: 0, alternative: 1 });
});
it('grupos ausentes y denominadores nulos conservan null, no inventan tasas cero', () => {
  const absent = compareGroupPolicies(rows.slice(0, 4), same, { G1: 1, G2: 1 }, costs);
  expect(absent.reference.groups.G2).toMatchObject({
    n: 0,
    accuracy: null,
    selection: null,
    precision: null,
    recall: null,
    fpr: null,
    fnr: null,
    totalCost: 0,
    meanCost: null,
  });
  expect(Object.values(absent.reference.gaps).every((v) => v === null)).toBe(true);
  expect(absent.alternative.groups.G1.precision).toBe(null);
  const noPos = rows.filter((r) => r.actual === 0),
    noNeg = rows.filter((r) => r.actual === 1);
  expect(compareGroupPolicies(noPos, same, same, costs).reference.overall).toMatchObject({
    recall: null,
    fnr: null,
    fpr: 1 / 3,
    precision: 0,
  });
  expect(compareGroupPolicies(noNeg, same, same, costs).reference.overall).toMatchObject({
    fpr: null,
    recall: 2 / 3,
  });
  expect(compareGroupPolicies([], same, same, costs).reference.overall.accuracy).toBe(null);
});
it('extremos y umbrales por grupo tienen semántica >= y selección monótona', () => {
  const edge = [...rows, { id: 'edge', group: 'G2' as const, actual: 1, score: 1, measurement: 0 }];
  const all = compareGroupPolicies(edge, { G1: 0, G2: 0 }, { G1: 1, G2: 1 }, costs);
  expect(all.reference.overall.selection).toBe(1);
  expect(all.alternative.overall.tp).toBe(1);
  expect(all.transitions.overall.toNegative).toBe(6);
  expect(all.transitions.overall.errorsFixed + all.transitions.overall.errorsIntroduced).toBe(6);
  const split = compareGroupPolicies(rows, same, { G1: 0.5, G2: 0.7 }, costs);
  expect(split.alternative.groups.G1.matrix).toEqual(split.reference.groups.G1.matrix);
  expect(split.alternative.groups.G2.fn).toBe(1);
  expect(split.alternative.groups.G2.totalCost).toBe(8);
});
it('histogramas de diez intervalos incluyen 0 y 1 y mantienen soporte', () => {
  const input: AuditRow[] = [0, 0.1, 1].map((score, i) => ({
    id: `edge-${i}`,
    group: 'G1',
    actual: i === 2 ? 1 : 0,
    score,
    measurement: 0,
  }));
  const h = auditHistogram(input, 'G1');
  expect(h).toHaveLength(10);
  expect(h[0]!.zero).toBe(1);
  expect(h[1]!.zero).toBe(1);
  expect(h[9]!.one).toBe(1);
  expect(auditHistogram(input, 'G2').every((b) => b.one + b.zero === 0)).toBe(true);
  expect(() => auditHistogram(input, 'bad' as never)).toThrow('AUDIT_GROUP');
});
it('generación reproducible, streams independientes y score con la misma regla por canal', () => {
  const a = generateAuditCohort(defaultAuditScenario),
    b = generateAuditCohort(defaultAuditScenario);
  expect(a).toEqual(b);
  expect(a.rows).toHaveLength(400);
  expect(
    generateAuditCohort({ ...defaultAuditScenario, count2: 100 }).rows.filter(
      (r) => r.group === 'G1',
    ),
  ).toEqual(a.rows.filter((r) => r.group === 'G1'));
  const zero = generateAuditCohort({ ...auditPresets.comparable, noise1: 0, noise2: 0 });
  for (const row of zero.rows) {
    expect(row.measurement).toBe(1.8 * (2 * row.actual - 1));
    expect(row.score).toBeCloseTo(1 / (1 + Math.exp(-row.measurement)), 15);
  }
  const audit = analyzeAudit(a, defaultAuditSettings());
  expect(audit.reference.overall.accuracy).toBeGreaterThan(0.9);
  expect(audit.reference.groups.G2.recall).toBeLessThan(0.8);
  expect(audit.reference.overall.accuracy).toBeGreaterThan(audit.reference.groups.G2.accuracy!);
  expect(
    generateAuditCohort(auditPresets.noPositives)
      .rows.filter((r) => r.group === 'G2')
      .every((r) => r.actual === 0),
  ).toBe(true);
  expect(
    generateAuditCohort(auditPresets.noNegatives)
      .rows.filter((r) => r.group === 'G2')
      .every((r) => r.actual === 1),
  ).toBe(true);
});
it('informe registra opciones, políticas efectivas, datos y reflexión sin modificar la cohorte', () => {
  const a = generateAuditCohort(auditPresets.comparable),
    settings = defaultAuditSettings(),
    before = hashValue(a.rows);
  settings.separated = true;
  settings.group2 = 0.3;
  const r = JSON.parse(
    exportAuditReport(a, settings, 'Espero observar diferencias.', {
      evidence: 'Recuentos',
      context: 'Etiquetas',
      action: 'Revisión con participantes',
    }),
  );
  expect(r).toMatchObject({
    format: 'neural-atlas.group-audit-report',
    schemaVersion: 1,
    recipeVersion: 1,
    dataHash: a.dataHash,
  });
  expect(r.analysis.thresholds.alternative).toEqual({ G1: 0.5, G2: 0.3 });
  expect(hashValue(a.rows)).toBe(before);
  expect(r.rows).toEqual(a.rows);
  expect(r.sampleRole).toContain('not train');
  a.rows[0]!.score = 0.25;
  expect(() =>
    exportAuditReport(a, settings, '', { evidence: '', context: '', action: '' }),
  ).toThrow('AUDIT_INTEGRITY');
});
it('rechaza filas, umbrales, costes, configuración libre y cohortes fuera de límites', () => {
  for (const change of [
    { score: NaN },
    { score: -1 },
    { score: 2 },
    { actual: 2 },
    { measurement: Infinity },
    { id: '__proto__' },
    { group: 'G3' },
  ])
    expect(() =>
      compareGroupPolicies([{ ...rows[0]!, ...change }] as AuditRow[], same, same, costs),
    ).toThrow();
  expect(() => compareGroupPolicies([rows[0]!, rows[0]!], same, same, costs)).toThrow('AUDIT_ROWS');
  expect(() => compareGroupPolicies(Array(801).fill(rows[0]), same, same, costs)).toThrow(
    'AUDIT_ROWS',
  );
  for (const t of [-1, 2, NaN])
    expect(() => compareGroupPolicies(rows, { ...same, G1: t }, same, costs)).toThrow(
      'AUDIT_THRESHOLD',
    );
  for (const c of [-1, 21, Infinity])
    expect(() =>
      compareGroupPolicies(rows, same, same, { ...costs, G2: { fp: c, fn: 1 } }),
    ).toThrow('AUDIT_COST');
  expect(() => compareGroupPolicies(rows, same, same, { G1: costs.G1 } as AuditCosts)).toThrow(
    'AUDIT_COST',
  );
  for (const change of [
    { count1: 0, count2: 0 },
    { count1: 401 },
    { prevalence2: 1.1 },
    { noise1: -0.1 },
    { offset2: 3 },
    { seed: -1 },
    { code: 'eval()' },
  ])
    expect(() => generateAuditCohort({ ...defaultAuditScenario, ...change })).toThrow();
  const source = generateAuditCohort(defaultAuditScenario);
  expect(() => analyzeAudit(source, { ...defaultAuditSettings(), group1: -1 })).toThrow();
});
