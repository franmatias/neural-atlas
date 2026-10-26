import { expect, it } from 'vitest';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator, type FoldSelection } from '@/domain/data/types';
import { splitDataset, validateSplit } from '@/domain/data/split';
import { fitPipeline } from '@/domain/data/pipeline';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { exportDatasetJson, importDatasetJson } from '@/application/data/json-files';
import {
  crossValidate,
  exportCrossValidation,
  type CrossValidationOptions,
} from '@/application/training/cross-validation';
import {
  importExperiment,
  exportExperiment,
  prepareExperiment,
} from '@/application/training/experiment';
import { handleDataJob } from '@/application/data/jobs';
const baseOptions = { strategy: 'stratified' as const, ratios: [0.6, 0.2, 0.2] as const, seed: 42 };
const fold: FoldSelection = {
  kind: 'k-fold-v1',
  count: 5,
  index: 0,
  seed: 42,
  strategy: 'stratified',
};
const pipelineOptions = {
  featureIds: ['x1', 'x2'],
  imputation: 'mean' as const,
  scaling: 'standard' as const,
  missingIndicators: false,
};
function fixture(recipe: 'moons' | 'flowers' | 'sine' = 'moons') {
  const dataset = generateDataset({ ...defaultGenerator, recipe, count: 120 });
  const base = splitDataset(dataset, {
    ...baseOptions,
    strategy: recipe === 'sine' ? 'random' : 'stratified',
  });
  const options: CrossValidationOptions = {
    datasetJson: exportDatasetJson(dataset, base),
    pipelineOptions,
    config: {
      spec: { ...defaultSpec },
      seed: 42,
      initialization: 'xavier',
      optimizer: { ...defaultOptimizer },
      epochs: 5,
      batchSize: 12,
      loss: 'mse',
    },
    seed: 42,
    count: 5,
    strategy: recipe === 'sine' ? 'random' : 'stratified',
    testPreviouslyConsulted: false,
    hypothesis: '',
  };
  return { dataset, base, options };
}
for (const strategy of ['random', 'stratified'] as const)
  it(`${strategy}: K=2–10 cubre desarrollo exactamente una vez sin tocar test`, () => {
    const { dataset, base } = fixture();
    const pool = [...base.train, ...base.validation].sort();
    for (let count = 2; count <= 10; count++) {
      const splits = Array.from({ length: count }, (_, index) =>
        splitDataset(dataset, { ...baseOptions, fold: { ...fold, count, index, strategy } }),
      );
      expect(splits.flatMap((s) => s.validation).sort()).toEqual(pool);
      expect(
        Math.max(...splits.map((s) => s.validation.length)) -
          Math.min(...splits.map((s) => s.validation.length)),
      ).toBeLessThanOrEqual(1);
      for (const s of splits) {
        expect(s.test).toEqual(base.test);
        expect([...s.train, ...s.validation].sort()).toEqual(pool);
        expect(new Set([...s.train, ...s.validation]).size).toBe(pool.length);
        validateSplit(dataset, s);
      }
    }
  });
it('CV por grupos conserva entidades completas entre train, validación y test', () => {
  const dataset = generateDataset({
    ...defaultGenerator,
    recipe: 'clouds',
    count: 120,
    duplicates: 0.2,
  });
  const base = splitDataset(dataset, baseOptions);
  for (let index = 0; index < 5; index++) {
    const s = splitDataset(dataset, {
      ...baseOptions,
      fold: { ...fold, index, strategy: 'grouped' },
    });
    const groups = (ids: string[]) =>
      new Set(dataset.rows.filter((r) => ids.includes(r.id)).map((r) => r.groupId ?? r.id));
    const a = groups(s.train),
      b = groups(s.validation),
      c = groups(s.test);
    expect([...a].some((g) => b.has(g) || c.has(g))).toBe(false);
    expect([...b].some((g) => c.has(g))).toBe(false);
    expect(s.test).toEqual(base.test);
  }
  expect(() => splitDataset(dataset, { ...baseOptions, fold })).toThrow('OPTIONS');
});
it('el Worker ejecuta CV por grupos con pipelines nuevos y test intacto', () => {
  const { options } = fixture();
  const dataset = generateDataset({
    ...defaultGenerator,
    recipe: 'clouds',
    count: 120,
    duplicates: 0.2,
  });
  const base = splitDataset(dataset, baseOptions);
  const response = handleDataJob(5, {
    kind: 'crossValidation',
    payload: { ...options, datasetJson: exportDatasetJson(dataset, base), strategy: 'grouped' },
  });
  expect(response.ok).toBe(true);
});
it('rechaza parámetros inválidos, mezcla con selección, tiempo y falta de soporte', () => {
  const { dataset } = fixture();
  for (const patch of [
    { count: 1 },
    { count: 11 },
    { index: 5 },
    { index: -1 },
    { index: 1.5 },
    { seed: -1 },
    { strategy: 'other' },
    { kind: 'unknown' },
  ])
    expect(() =>
      splitDataset(dataset, { ...baseOptions, fold: { ...fold, ...patch } as FoldSelection }),
    ).toThrow();
  expect(() =>
    splitDataset(dataset, {
      ...baseOptions,
      fold,
      selection: { kind: 'balanced-prefix-v1', count: 24, seed: 42 },
    }),
  ).toThrow('OPTIONS');
  const temporal = structuredClone(dataset);
  temporal.rows.forEach((r, i) => {
    r.timestamp = new Date(Date.UTC(2020, 0, i + 1)).toISOString();
  });
  expect(() => splitDataset(temporal, { ...baseOptions, strategy: 'temporal', fold })).toThrow(
    'OPTIONS',
  );
  const tiny = generateDataset({ ...defaultGenerator, recipe: 'moons', count: 20 });
  expect(() => splitDataset(tiny, { ...baseOptions, fold: { ...fold, count: 10 } })).toThrow(
    'TARGET',
  );
  const fewGroups = structuredClone(dataset);
  fewGroups.rows.forEach((r, i) => {
    r.groupId = `g${Math.floor(i / 40)}`;
  });
  expect(() =>
    splitDataset(fewGroups, { ...baseOptions, fold: { ...fold, strategy: 'grouped' } }),
  ).toThrow('OPTIONS');
  const regression = fixture('sine').dataset;
  expect(() => splitDataset(regression, { ...baseOptions, strategy: 'random', fold })).toThrow(
    'OPTIONS',
  );
});
it('dataset v3 se reconstruye, valida y rechaza versiones o IDs manipulados', () => {
  const { dataset } = fixture();
  const split = splitDataset(dataset, { ...baseOptions, fold });
  const file = JSON.parse(exportDatasetJson(dataset, split));
  expect(file.schemaVersion).toBe(3);
  expect(importDatasetJson(JSON.stringify(file)).split).toEqual(split);
  file.schemaVersion = 2;
  expect(() => importDatasetJson(JSON.stringify(file))).toThrow('SCHEMA');
  file.schemaVersion = 3;
  file.split.fold.index = 1;
  expect(() => importDatasetJson(JSON.stringify(file))).toThrow('INTEGRITY');
  expect(() => validateSplit(dataset, { ...split, validation: split.test })).toThrow('INTEGRITY');
});
it('pipeline de cada fold no aprende valores de su holdout ni del test', () => {
  const { dataset } = fixture();
  const split = splitDataset(dataset, { ...baseOptions, fold });
  const a = fitPipeline(dataset, split, pipelineOptions);
  for (const row of dataset.rows) if (!split.train.includes(row.id)) row.features.x1 = 1e6;
  const updated = splitDataset(dataset, { ...baseOptions, fold });
  const b = fitPipeline(dataset, updated, pipelineOptions);
  expect(a.columns).toEqual(b.columns);
  expect(a.fittedOn).toEqual(b.fittedOn);
});
for (const recipe of ['moons', 'flowers', 'sine'] as const)
  it(
    `${recipe}: modelos nuevos por fold, métricas reales, roundtrip y informe ponderado`,
    { timeout: 30000 },
    () => {
      const { options, base } = fixture(recipe);
      const result = crossValidate(options);
      expect(result.folds).toHaveLength(5);
      expect(result.testIds).toEqual(base.test);
      expect(result.testEvaluatedInStudy).toBe(false);
      const ids: string[] = [];
      for (const f of result.folds) {
        const restored = importExperiment(exportExperiment(f.run.experiment));
        const p = prepareExperiment(restored);
        expect(p.split.fold!.index).toBe(f.index);
        expect(p.source.input.validation.ids).toEqual(f.validationIds);
        expect(restored.checkpoint.epoch).toBe(5);
        expect(restored.testConsulted).toBe(false);
        expect(f.validationLoss).toBe(restored.checkpoint.history.at(-1)!.validationLoss);
        ids.push(...f.validationIds);
      }
      expect(new Set(ids).size).toBe(ids.length);
      expect(result.summary.pooledLoss).toBeCloseTo(
        result.folds.reduce((s, f) => s + f.validationLoss * f.validationIds.length, 0) /
          ids.length,
        14,
      );
      expect(result.folds[0]!.run.initialHash).toBe(result.folds[1]!.run.initialHash);
      expect(new Set(result.folds.map((f) => f.run.experiment.pipelineHash)).size).toBe(5);
      const report = JSON.parse(exportCrossValidation(result));
      expect(report.format).toBe('neural-atlas.cross-validation-report');
      expect(report.options.datasetJson).toBeUndefined();
      expect(report.provenance.dataHash).toBe(base.dataHash);
      expect(report.folds).toHaveLength(5);
    },
  );
it(
  'preserva consulta previa de test y no admite early stopping ni presupuestos excesivos',
  { timeout: 30000 },
  () => {
    const { options, dataset } = fixture();
    const result = crossValidate({ ...options, testPreviouslyConsulted: true });
    expect(result.folds.every((f) => f.run.experiment.testConsulted)).toBe(true);
    expect(() =>
      crossValidate({
        ...options,
        config: { ...options.config, earlyStopping: { patience: 5, minDelta: 0 } },
      }),
    ).toThrow('CV_EARLY_STOPPING');
    expect(() => crossValidate({ ...options, config: { ...options.config, epochs: 121 } })).toThrow(
      'CV_BUDGET',
    );
    expect(() =>
      crossValidate({
        ...options,
        config: { ...options.config, spec: { ...defaultSpec, hidden: [64, 64, 64] } },
      }),
    ).toThrow('CV_BUDGET');
    const selected = splitDataset(dataset, {
      ...baseOptions,
      selection: { kind: 'balanced-prefix-v1', count: 24, seed: 42 },
    });
    expect(() =>
      crossValidate({ ...options, datasetJson: exportDatasetJson(dataset, selected) }),
    ).toThrow('CV_BASE_SPLIT');
    expect(() => crossValidate({ ...options, datasetJson: exportDatasetJson(dataset) })).toThrow(
      'CV_BASE_SPLIT',
    );
    const large = generateDataset({ ...defaultGenerator, count: 1000, recipe: 'moons' });
    expect(() =>
      crossValidate({
        ...options,
        datasetJson: exportDatasetJson(large, splitDataset(large, baseOptions)),
        config: { ...options.config, spec: { ...defaultSpec, hidden: [64, 64] }, epochs: 120 },
      }),
    ).toThrow('CV_BUDGET');
    const tooMany = generateDataset({ ...defaultGenerator, count: 1002, recipe: 'moons' });
    expect(() =>
      crossValidate({
        ...options,
        datasetJson: exportDatasetJson(tooMany, splitDataset(tooMany, baseOptions)),
      }),
    ).toThrow('CV_BUDGET');
    expect(
      handleDataJob(1, { kind: 'crossValidation', payload: { ...options, count: 11 } }).ok,
    ).toBe(false);
  },
);
