import { it, expect } from 'vitest';
import { runWorkshop } from '@/application/workshops/experiments';
import {
  advancedWorkshopDefaults,
  defaultWorkshopOptions,
  optionsSchema,
  evidenceSchema,
  evaluateRule,
} from '@/application/workshops/contracts';
import { importExperiment, prepareExperiment } from '@/application/training/experiment';
import { advanceBatch } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { forward } from '@/domain/network/model';
import { generateAuditCohort, defaultAuditScenario } from '@/application/training/group-audit';
import { failureCases } from '@/content/failure-cases';
import { inspectFailure } from '@/application/workshops/failure-probes';
const base = { ...defaultWorkshopOptions, budgetAccepted: true, epochs: 5 };
it.each(['leak', 'output', 'bn', 'labels', 'relu'] as const)(
  'biblioteca %s: modo seguro, oráculo y reparación exportable',
  (fault) => {
    const metadata = failureCases.find((c) => c.id === fault)!;
    expect(metadata.symptom.length).toBeGreaterThan(20);
    expect(metadata.allowedInterventions.length).toBeGreaterThan(0);
    expect(metadata.teacherSolution.length).toBeGreaterThan(30);
    const r = runWorkshop('T12', { ...base, advanced: { ...advancedWorkshopDefaults, fault } }),
      e = importExperiment(r.experiment!),
      p = prepareExperiment(e);
    expect(r.metrics).toMatchObject({
      originalUnchanged: true,
      repairPreservesSplit: true,
      testConsulted: false,
    });
    expect(e.testConsulted).toBe(false);
    expect(exhaust(advanceBatch(e.checkpoint, p.source.input)).updates).toBe(
      e.checkpoint.updates + 1,
    );
    if (fault === 'bn' || fault === 'output') {
      expect(r.metrics.validationRejected).toBe(true);
      expect(r.rows[0]!.values[0]).toBe(fault === 'bn' ? 'INVALID_CONFIG' : 'INVALID_DATA');
      expect(r.curves).toHaveLength(1);
      if (fault === 'bn') {
        expect(e.config.spec.batchNormalization).toBe(true);
        expect(e.config.batchSize).toBe(12);
      }
    }
    if (fault === 'leak') {
      expect(r.metrics.illustrativeHoldoutConsulted).toBe(true);
      expect(r.rows.map((row) => row.values[1])).toEqual([1, 0.02]);
    }
    if (fault === 'labels') {
      expect(r.rows[1]!.values).toEqual([72, 15]);
      expect(r.rows[2]!.values).toEqual([72, 0]);
    }
    if (fault === 'relu') {
      expect(e.config.spec.activation).toBe('relu');
      expect(r.rows[1]!.values).toEqual([576, 576]);
      expect(r.rows[0]!.values[0] as number).toBeLessThan(576);
    }
    expect(() => inspectFailure('zero', e)).toThrow('FAILURE_PROBE');
  },
);
it('conserva opciones antiguas, valida controles nuevos y exige presupuestos', () => {
  expect(Object.hasOwn(optionsSchema.parse(defaultWorkshopOptions), 'advanced')).toBe(false);
  for (const id of ['T06', 'T08', 'T09', 'T12'] as const)
    expect(() => runWorkshop(id, defaultWorkshopOptions)).toThrow('WORKSHOP_BUDGET');
  expect(() =>
    optionsSchema.parse({ ...base, advanced: { ...advancedWorkshopDefaults, threshold: 2 } }),
  ).toThrow();
  const evidence = runWorkshop('T11', base);
  evidence.metrics.groupRecallGap = null;
  expect(evidenceSchema.parse(evidence).metrics.groupRecallGap).toBe(null);
  expect(evaluateRule({ operator: 'finite', metrics: ['groupRecallGap'] }, '', evidence)).toBe(
    false,
  );
});
it('T06 lambda cero iguala trayectorias y conserva datos/inicialización; L2 no promete mejora', () => {
  const same = runWorkshop('T06', {
    ...base,
    advanced: { ...advancedWorkshopDefaults, lambda: 0 },
  });
  expect(same.curves[0]!.history).toEqual(same.curves[1]!.history);
  expect(same.metrics).toMatchObject({
    originalUnchanged: true,
    repairPreservesSplit: true,
    testConsulted: false,
    trainSupport: 72,
    validationSupport: 24,
  });
  const l2 = runWorkshop('T06', base);
  expect(l2.curves[0]!.history[0]!.trainLoss).toBe(l2.curves[1]!.history[0]!.trainLoss);
  expect(l2.curves[1]!.history[0]!.regularizationPenalty).toBeGreaterThan(0);
  expect(l2.curves[1]!.label).toBe('L2');
});
it('T07/T11 costes y errores con umbrales extremos tienen oráculo por etiquetas', () => {
  const cohort = generateAuditCohort({ ...defaultAuditScenario, seed: base.seed }),
    negative = cohort.rows.filter((r) => r.actual === 0),
    positive = cohort.rows.filter((r) => r.actual === 1);
  const all = runWorkshop('T07', {
    ...base,
    advanced: { ...advancedWorkshopDefaults, threshold: 0 },
  });
  expect(all.metrics.fp).toBe(negative.length);
  expect(all.metrics.fn).toBe(0);
  expect(all.metrics.cost).toBe(negative.reduce((s, r) => s + (r.group === 'G1' ? 1 : 2), 0));
  const none = runWorkshop('T11', {
    ...base,
    advanced: { ...advancedWorkshopDefaults, threshold: 1 },
  });
  expect(none.metrics.fp).toBe(0);
  expect(none.metrics.fn).toBe(positive.length);
  expect(none.metrics.cost).toBe(positive.reduce((s, r) => s + (r.group === 'G1' ? 5 : 8), 0));
  expect(none.rows).toHaveLength(4);
  expect(none.rows[2]!.values[5]).toContain('/');
});
it('T08 baseline y R² calculados en validación; experimento completo continúa un lote', () => {
  const r = runWorkshop('T08', base),
    experiment = importExperiment(r.experiment!),
    prepared = prepareExperiment(experiment),
    samples = prepared.source.input.validation;
  const predicted = samples.x.map(
      (x) => forward(experiment.checkpoint.model, x).activations.at(-1)![0]!,
    ),
    mean = samples.y.reduce((s, y) => s + y, 0) / samples.y.length,
    sse = samples.y.reduce((s, y, i) => s + (y - predicted[i]!) ** 2, 0),
    sst = samples.y.reduce((s, y) => s + (y - mean) ** 2, 0),
    baseline =
      samples.y.reduce((s, y) => s + (y - experiment.checkpoint.baseline) ** 2, 0) /
      samples.y.length;
  expect(r.metrics.baselineReferenceLoss).toBeCloseTo(baseline, 12);
  expect(r.metrics.baselineScore).toBeCloseTo(1 - sse / sst, 12);
  expect(experiment.testConsulted).toBe(false);
  expect(experiment.checkpoint.epoch).toBe(5);
  expect(experiment.config.epochs).toBe(6);
  expect(prepared.split.test).toHaveLength(24);
  expect(exhaust(advanceBatch(experiment.checkpoint, prepared.source.input)).updates).toBe(
    experiment.checkpoint.updates + 1,
  );
  expect(r.curves[0]!.scoreKind).toBe('mse');
});
it('T09 conserva defectos/anotaciones y transforma sin fuga ni no finitos', () => {
  const r = runWorkshop('T09', base);
  expect(r.metrics).toMatchObject({
    nonFinite: 0,
    fittedTrain: true,
    originalUnchanged: true,
    testConsulted: false,
  });
  expect(r.rows[0]!.values).toEqual([120]);
  expect(Number(r.rows[1]!.values[0])).toBeGreaterThan(0);
  expect(r.rows[3]!.values[0]).toContain('9 filas');
});
it('T10 diferencia clipping del recorte de posición y conserva parada fuera de dominio', () => {
  const r = runWorkshop('T10', {
    ...base,
    rate: 0.1,
    advanced: { ...advancedWorkshopDefaults, clipNorm: 0.5 },
  });
  expect(r.metrics.baselineNorm).toBeCloseTo(Math.hypot(215.6, 88), 10);
  expect(r.metrics.variantNorm).toBeCloseTo(0.5, 12);
  expect(r.rows[0]!.values.at(-1)).toBe('outside');
  expect(r.rows[0]!.values[3]).toBe(1);
});
it.each(['zero', 'rate', 'units'] as const)(
  'T12 %s: reparación controlada, exportación y sonda train sin test',
  (fault) => {
    const r = runWorkshop('T12', { ...base, advanced: { ...advancedWorkshopDefaults, fault } }),
      e = importExperiment(r.experiment!),
      p = prepareExperiment(e);
    expect(r.metrics).toMatchObject({
      originalUnchanged: true,
      repairPreservesSplit: true,
      testConsulted: false,
    });
    expect(e.testConsulted).toBe(false);
    expect(p.split.train).toHaveLength(72);
    expect(exhaust(advanceBatch(e.checkpoint, p.source.input)).updates).toBe(
      e.checkpoint.updates + 1,
    );
    if (fault === 'units') {
      const x = p.source.input.train.x[0]!,
        good = forward(e.checkpoint.model, x).activations.at(-1)![0]!,
        bad = forward(
          e.checkpoint.model,
          x.map((v) => 1000 * v),
        ).activations.at(-1)![0]!;
      expect(r.rows[0]!.values[0]).toBe(good);
      expect(r.rows[1]!.values[0]).toBe(bad);
    } else {
      expect(r.curves).toHaveLength(2);
      if (fault === 'rate') {
        expect(e.config.optimizer.kind).toBe('sgd');
        expect(r.curves.map((c) => c.rate)).toEqual([1, 0.01]);
        expect(r.curves[0]!.history[0]!.trainLoss).toBe(r.curves[1]!.history[0]!.trainLoss);
      } else expect(e.config.initialization).toBe('xavier');
    }
  },
);
