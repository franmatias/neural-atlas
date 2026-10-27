import { it, expect } from 'vitest';
import {
  defaultGrid,
  prepareGrid,
  runGridTrial,
  summarizeGrid,
  exportGridReport,
  type GridOptions,
  type GridMeasurement,
} from '@/application/training/grid-search';
import { trainingFixture } from '../fixtures/training';
import { exportDatasetJson } from '@/application/data/json-files';
import { importInferenceModel } from '@/application/training/inference-model';
import { splitDataset } from '@/domain/data/split';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { handleDataJob } from '@/application/data/jobs';
it('agrupa duplicados sin mezclar grupos y rechaza protocolos y dimensiones no admitidos', () => {
  const d = generateDataset({ ...defaultGenerator, count: 60, duplicates: 0.2 }),
    base = splitDataset(d, { strategy: 'stratified-grouped', ratios: [0.6, 0.2, 0.2], seed: 42 });
  const o = { ...options(), datasetJson: exportDatasetJson(d, base), folds: 3 as const };
  const p = prepareGrid(o);
  const rows = new Map(d.rows.map((r) => [r.id, r]));
  for (const t of p.trials) {
    const trainGroups = new Set(t.trainIds.map((id) => rows.get(id)!.groupId).filter(Boolean));
    expect(
      t.validationIds.some((id) => rows.get(id)!.groupId && trainGroups.has(rows.get(id)!.groupId)),
    ).toBe(false);
  }
  const f = trainingFixture('moons', 40),
    fold = splitDataset(f.dataset, {
      strategy: f.split.strategy,
      ratios: f.split.ratios,
      seed: f.split.seed,
      fold: { kind: 'k-fold-v1', count: 3, index: 0, seed: 42, strategy: 'stratified' },
    });
  expect(() => prepareGrid({ ...o, datasetJson: exportDatasetJson(f.dataset, fold) })).toThrow(
    'GRID_SOURCE',
  );
  const temporal = structuredClone(f.dataset);
  delete temporal.recipe;
  temporal.rows.forEach((r, i) => (r.timestamp = new Date(Date.UTC(2025, 0, 1 + i)).toISOString()));
  expect(() =>
    prepareGrid({
      ...o,
      datasetJson: exportDatasetJson(
        temporal,
        splitDataset(temporal, { strategy: 'temporal', ratios: [0.6, 0.2, 0.2], seed: 42 }),
      ),
    }),
  ).toThrow('GRID_SOURCE');
  const wide = structuredClone(f.dataset);
  delete wide.recipe;
  wide.features = Array.from({ length: 8 }, (_, i) => ({
    id: 'f' + i,
    name: 'Feature ' + i,
    kind: 'categorical' as const,
  }));
  wide.rows.forEach(
    (r, i) => (r.features = Object.fromEntries(wide.features.map((f) => [f.id, String(i % 3)]))),
  );
  const split = splitDataset(wide, { strategy: 'stratified', ratios: [0.7, 0.15, 0.15], seed: 42 });
  expect(() =>
    prepareGrid({
      ...o,
      datasetJson: exportDatasetJson(wide, split),
      pipeline: {
        featureIds: wide.features.map((f) => f.id),
        imputation: 'mean',
        scaling: 'standard',
        missingIndicators: false,
      },
    }),
  ).toThrow('GRID_FEATURES');
});
function options(recipe: 'moons' | 'flowers' | 'sine' = 'moons'): GridOptions {
  const f = trainingFixture(recipe, 40);
  return {
    ...defaultGrid,
    widths: [2],
    rates: [0.01],
    epochs: 5,
    pipeline: f.prepared.pipeline.options,
    datasetJson: exportDatasetJson(f.dataset, f.split),
    testPreviouslyConsulted: false,
  };
}
it.each(['moons', 'flowers', 'sine'] as const)(
  'plan, métricas deterministas y modelo independiente en %s',
  (recipe) => {
    const o = options(recipe),
      plan = prepareGrid(o),
      m = runGridTrial(o, plan.hash, 0);
    expect(m.validationLoss).toBeGreaterThanOrEqual(0);
    const again = runGridTrial(o, plan.hash, 0);
    expect({ ...m, model: undefined }).toEqual({ ...again, model: undefined });
    expect(importInferenceModel(m.model).network).toEqual(
      importInferenceModel(again.model).network,
    );
    const model = importInferenceModel(m.model);
    expect(model.pipeline.fittedOn.idsHash).toBeTruthy();
    expect(model.hashes.pipelineHash).toBe(plan.trials[0]!.pipelineHash);
    expect(model.task).toBe(
      recipe === 'sine' ? 'regression' : recipe === 'flowers' ? 'multiclass' : 'binary',
    );
    expect(model.training.testConsulted).toBe(false);
    expect(plan.testEvaluated).toBe(false);
    expect(handleDataJob(1, { kind: 'gridPlan', payload: o }).ok).toBe(true);
    expect(
      handleDataJob(2, { kind: 'gridTrial', payload: { options: o, planHash: plan.hash, id: 0 } })
        .ok,
    ).toBe(true);
    const report = JSON.parse(
      exportGridReport(plan, [{ id: 0, status: 'completed', measurement: m }]),
    );
    expect(report.format).toBe('neural-atlas.grid-report');
    expect(report.attempts[0].measurement.model).toBeUndefined();
    expect(report.plan.settings.datasetJson).toBeUndefined();
    expect(report.summary.ranking).toEqual([0]);
  },
);
it('producto cartesiano y 27 ejecuciones, presupuestos sumados y particiones comunes', () => {
  const o = {
    ...options(),
    widths: [2, 4, 8],
    rates: [0.001, 0.01, 0.05],
    repetitions: 3 as const,
  };
  const p = prepareGrid(o);
  expect(p.configurations.map((c) => [c.width, c.rate])).toEqual([
    [2, 0.001],
    [2, 0.01],
    [2, 0.05],
    [4, 0.001],
    [4, 0.01],
    [4, 0.05],
    [8, 0.001],
    [8, 0.01],
    [8, 0.05],
  ]);
  expect(p.trials).toHaveLength(27);
  expect(p.trials.slice(0, 3).map((t) => t.seed)).toEqual([42, 43, 44]);
  expect(new Set(p.trials.map((t) => t.pipelineHash)).size).toBe(1);
  expect(p.budget.operations).toBe(p.trials.reduce((s, t) => s + t.budget.upper, 0));
  expect(p.budget.updates).toBe(p.trials.reduce((s, t) => s + t.budget.updates, 0));
  expect(() => prepareGrid({ ...o, folds: 3 })).toThrow('GRID_TRIALS');
  expect(() => runGridTrial(o, '0'.repeat(64), 0)).toThrow('GRID_PLAN');
  expect(() => runGridTrial(o, p.hash, -1)).toThrow('GRID_PLAN');
});
it('folds train-only, test extremo y procedencia de consulta anterior', () => {
  const f = trainingFixture('moons', 40),
    base = { ...options(), folds: 3 as const, testPreviouslyConsulted: true };
  const p = prepareGrid(base);
  const validation = p.trials.flatMap((t) => t.validationIds);
  expect(new Set(validation).size).toBe(f.split.train.length + f.split.validation.length);
  for (const t of p.trials) {
    expect(t.trainIds.some((id) => t.validationIds.includes(id) || f.split.test.includes(id))).toBe(
      false,
    );
    expect(t.validationIds.some((id) => f.split.test.includes(id))).toBe(false);
  }
  const changed = structuredClone(f.dataset);
  for (const r of changed.rows)
    if (f.split.test.includes(r.id)) for (const k of Object.keys(r.features)) r.features[k] = 10000;
  const newSplit = splitDataset(changed, {
    strategy: f.split.strategy,
    ratios: f.split.ratios,
    seed: f.split.seed,
  });
  const altered = { ...base, datasetJson: exportDatasetJson(changed, newSplit) },
    q = prepareGrid(altered);
  const a = importInferenceModel(runGridTrial(base, p.hash, 0).model),
    b = importInferenceModel(runGridTrial(altered, q.hash, 0).model);
  expect(a.network).toEqual(b.network);
  expect(a.pipeline.columns).toEqual(b.pipeline.columns);
  expect(a.training.testConsulted).toBe(true);
});
it('rechazos antes de entrenar por dominio, duplicados, fuente y coste global', () => {
  const o = options();
  expect(() => prepareGrid({ ...o, widths: [2, 2] })).toThrow('GRID_DUPLICATES');
  expect(() => prepareGrid({ ...o, rates: [0.01, 0.01] })).toThrow('GRID_DUPLICATES');
  for (const patch of [
    { rates: [NaN] },
    { rates: [0] },
    { widths: [17] },
    { epochs: 61 },
    { repetitions: 2 },
    { folds: 2 },
  ])
    expect(() => prepareGrid({ ...o, ...patch } as GridOptions)).toThrow();
  const f = trainingFixture('moons', 40);
  expect(() => prepareGrid({ ...o, datasetJson: exportDatasetJson(f.dataset) })).toThrow(
    'GRID_SOURCE',
  );
  expect(() => prepareGrid({ ...o, datasetJson: ' '.repeat(4 * 1024 * 1024 + 1) })).toThrow();
  const big = generateDataset({ ...defaultGenerator, count: 600 });
  const split = splitDataset(big, { strategy: 'stratified', ratios: [0.7, 0.15, 0.15], seed: 42 });
  expect(() =>
    prepareGrid({
      ...o,
      datasetJson: exportDatasetJson(big, split),
      widths: [14, 15, 16],
      rates: [0.01, 0.02, 0.03],
      repetitions: 3,
      epochs: 60,
    }),
  ).toThrow('GRID_BUDGET');
});
it('agregación con soportes desiguales, empate estable y fallos fuera de selección', () => {
  const p = prepareGrid({ ...options(), widths: [2, 4], folds: 3 });
  const losses = [1, 2, 4, 1, 2, 4];
  const attempts = p.trials.map((t, i) => ({
    id: t.id,
    status: 'completed' as const,
    measurement: {
      id: t.id,
      planHash: p.hash,
      validationLoss: losses[i]!,
      model: '',
      trainLoss: 0,
      validationScore: 0,
      updates: 1,
      initialHash: '',
      pipelineHash: '',
    } satisfies GridMeasurement,
  }));
  const s = summarizeGrid(p, attempts);
  const support = p.trials.slice(0, 3).map((t) => t.validationIds.length);
  expect(s.configurations[0]!.loss).toBeCloseTo(
    (support[0]! + 2 * support[1]! + 4 * support[2]!) / support.reduce((a, b) => a + b, 0),
  );
  expect(s.ranking).toEqual([0, 1]);
  expect(s.progression.map((p) => p.best)).toEqual([
    s.configurations[0]!.loss,
    s.configurations[0]!.loss,
  ]);
  expect(summarizeGrid(p, [...attempts.slice(0, -1), { id: 5, status: 'failed' }]).ranking).toEqual(
    [0],
  );
  expect(summarizeGrid(p, []).complete).toBe(false);
  expect(() => summarizeGrid(p, [attempts[0]!, attempts[0]!])).toThrow('GRID_EVIDENCE');
  expect(() =>
    summarizeGrid(p, [
      { ...attempts[0]!, measurement: { ...attempts[0]!.measurement, planHash: 'bad' } },
    ]),
  ).toThrow('GRID_EVIDENCE');
});
