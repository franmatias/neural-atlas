import { expect, it, vi } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import { exportDatasetJson } from '@/application/data/json-files';
import {
  predictionDispersion,
  exportDispersion,
} from '@/application/training/prediction-dispersion';
import {
  shiftScenario,
  compareDistributionShift,
  exportDistributionShift,
} from '@/application/training/distribution-shift';
import { compareModels, exportPairedComparison } from '@/application/training/paired-comparison';
import { prepareExperiment } from '@/application/training/experiment';
import { exhaust } from '@/domain/training/kernel';
import { evaluateChunks } from '@/domain/training/session';
import { prepareBoundedStudy } from '@/application/training/study-budget';
const shift = {
  kind: 'covariate' as const,
  severity: 0.8,
  seed: 42,
  epochs: 5,
  rate: 0.02,
  hypothesis: 'La regla se conserva.',
};
it('el estudio rechaza presupuestos excesivos antes de entrenar o reservar diez modelos', () => {
  const f = trainingFixture(),
    json = exportDatasetJson(f.dataset, f.split),
    options = f.prepared.pipeline.options;
  expect(() => prepareBoundedStudy(json, { ...f.config, epochs: 121 }, options)).toThrow(
    'STUDY_BUDGET',
  );
  expect(() =>
    prepareBoundedStudy(
      json,
      { ...f.config, spec: { ...f.config.spec, hidden: [64, 64, 64] } },
      options,
    ),
  ).toThrow('STUDY_BUDGET');
  expect(() =>
    prepareBoundedStudy(
      json,
      { ...f.config, epochs: 120, spec: { ...f.config.spec, hidden: [64, 64] } },
      options,
      10,
    ),
  ).toThrow('STUDY_BUDGET');
});
it.each(['moons', 'flowers', 'sine'] as const)(
  'dispersión %s: todas las filas val, media/SD independientes, test reservado',
  (recipe) => {
    const f = trainingFixture(recipe),
      options = {
        datasetJson: exportDatasetJson(f.dataset, f.split),
        config: { ...f.config, epochs: 2 },
        pipelineOptions: f.prepared.pipeline.options,
        count: 3 as const,
        firstSeed: 0xffffffff,
        testPreviouslyConsulted: true,
        hypothesis: 'Variabilidad por inicialización y orden.',
      };
    const result = predictionDispersion(options);
    expect(result.runs.map((r) => r.experiment.config.seed)).toEqual([0xffffffff, 0, 1]);
    expect(result.probes.map((p) => p.id)).toEqual(f.split.validation);
    expect(result.runs.every((r) => r.experiment.testConsulted)).toBe(true);
    for (const p of result.probes)
      for (let i = 0; i < p.outputs.length; i++) {
        const values = p.predictions.map((v) => v[i]!),
          mean = values.reduce((a, b) => a + b, 0) / 3;
        expect(p.outputs[i]!.mean).toBeCloseTo(mean, 14);
        expect(p.outputs[i]!.sampleDeviation).toBeCloseTo(
          Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / 2),
          14,
        );
      }
    expect(JSON.parse(exportDispersion(result)).options.datasetJson).toBeUndefined();
  },
);
it.each(['covariate', 'concept', 'serving'] as const)(
  'deriva %s: caso cero exacto, procedencia y pipeline congelado',
  (kind) => {
    const zero = compareDistributionShift({ ...shift, kind, severity: 0 });
    expect(zero.changed).toEqual(zero.baseline);
    const s = shiftScenario({ ...shift, kind }),
      train = new Set(s.split.train),
      test = new Set(s.split.test);
    expect(s.pairs.every((p) => !train.has(p.id) && !test.has(p.id))).toBe(true);
    expect(s.shifted.rows.filter((r) => train.has(r.id) || test.has(r.id))).toEqual(
      s.dataset.rows.filter((r) => train.has(r.id) || test.has(r.id)),
    );
    if (kind === 'covariate')
      expect(
        s.pairs.every(
          (p) => p.conditionalAfter === 1 / (1 + Math.exp(-6 * Number(p.changed.features.x1))),
        ),
      ).toBe(true);
    if (kind === 'concept')
      expect(
        s.pairs.every(
          (p) => JSON.stringify(p.original.features) === JSON.stringify(p.changed.features),
        ),
      ).toBe(true);
    if (kind === 'serving')
      expect(s.pairs.every((p) => p.original.target === p.changed.target)).toBe(true);
    const r = compareDistributionShift({ ...shift, kind });
    expect(r.pipeline.fittedOn.idsHash).toBe(zero.pipeline.fittedOn.idsHash);
    expect(r.run.experiment.checkpoint).toEqual(zero.run.experiment.checkpoint);
    expect(JSON.parse(exportDistributionShift(r))).toMatchObject({
      pipelineRefitted: false,
      testEvaluatedInStudy: false,
    });
  },
);
it('presupuesto por updates: parada parcial, métricas actuales y checkpoint reanudable', () => {
  const f = trainingFixture(),
    config = { ...f.config, epochs: 5 };
  const result = compareModels({
    datasetJson: exportDatasetJson(f.dataset, f.split),
    a: config,
    b: config,
    pipelineA: f.prepared.pipeline.options,
    pipelineB: f.prepared.pipeline.options,
    hypothesis: 'Igualar updates.',
    testPreviouslyConsulted: false,
    budget: { kind: 'updates', limit: 9 },
  });
  for (const run of result.runs) {
    expect(run.experiment.checkpoint.updates).toBe(9);
    expect(run.stop!.point.update).toBe(9);
    expect(run.stop!.reason).toBe('updates');
    const p = prepareExperiment(run.experiment),
      metric = exhaust(
        evaluateChunks(run.experiment.checkpoint.model, p.source.input.validation, config.loss),
      );
    expect(run.stop!.point.validationLoss).toBe(metric.loss);
    expect(run.experiment.checkpoint.cursor).toBeGreaterThan(0);
  }
  expect(result.delta.validationLoss).toBe(0);
  expect(JSON.parse(exportPairedComparison(result)).runs[0].stop.point.update).toBe(9);
});
it('presupuesto temporal entre lotes declara tiempo observado y horizonte sin fingir reproducibilidad', () => {
  const f = trainingFixture();
  let time = 0;
  const spy = vi.spyOn(performance, 'now').mockImplementation(() => (time += 60));
  try {
    const result = compareModels({
      datasetJson: exportDatasetJson(f.dataset, f.split),
      a: f.config,
      b: f.config,
      pipelineA: f.prepared.pipeline.options,
      pipelineB: f.prepared.pipeline.options,
      hypothesis: 'Tiempo orientativo.',
      testPreviouslyConsulted: false,
      budget: { kind: 'time', limit: 50 },
    });
    expect(
      result.runs.every(
        (r) =>
          r.experiment.checkpoint.updates === 1 &&
          r.stop!.reason === 'time' &&
          r.stop!.elapsedMs >= 50,
      ),
    ).toBe(true);
  } finally {
    spy.mockRestore();
  }
});
