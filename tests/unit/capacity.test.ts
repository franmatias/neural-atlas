import { expect, it } from 'vitest';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { splitDataset, validateSplit } from '@/domain/data/split';
import { fitPipeline } from '@/domain/data/pipeline';
import { importDatasetJson, exportDatasetJson } from '@/application/data/json-files';
import { compareCapacity, defaultCapacity, exportCapacity } from '@/application/training/capacity';
import {
  exportExperiment,
  importExperiment,
  prepareExperiment,
} from '@/application/training/experiment';
import {
  modelFromExperiment as fromExperiment,
  exportInferenceModel,
  importInferenceModel,
  predictWithModel,
} from '@/application/training/inference-model';
import { handleDataJob } from '@/application/data/jobs';
import { trainingSource } from '@/application/training/source';
import { transformRow } from '@/domain/data/pipeline';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { initialSession, advanceBatch } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { captureExperiment } from '@/application/training/experiment';
const base = { strategy: 'stratified' as const, ratios: [0.6, 0.2, 0.2] as const, seed: 42 };
const selection = { kind: 'balanced-prefix-v1' as const, count: 24, seed: 42 };
const dataset = () => generateDataset({ ...defaultGenerator, recipe: 'moons', count: 120 });
for (const kind of ['sgd', 'momentum', 'rmsprop', 'adam'] as const)
  it(`${kind}: prefijo y dataset v2 reanudan exactamente BN/dropout/early/aumento`, () => {
    const d = generateDataset({ ...defaultGenerator, recipe: 'circles', count: 120 });
    const split = splitDataset(d, { ...base, selection });
    const pipeline = fitPipeline(d, split, {
      featureIds: ['x1', 'x2'],
      imputation: 'mean',
      scaling: 'standard',
      missingIndicators: false,
    });
    const source = trainingSource(
      d,
      split,
      { pipeline, matrix: d.rows.map((row) => transformRow(row, pipeline)) },
      {
        spec: { ...defaultSpec, batchNormalization: true },
        initialization: 'xavier',
        seed: 42,
        optimizer: { ...defaultOptimizer, kind },
        epochs: 5,
        batchSize: 12,
        loss: 'mse',
        dropout: { rate: 0.5 },
        earlyStopping: { patience: 5, minDelta: 0.001 },
        augmentation: { policy: 'circles', sigma: 0.01, copies: 1, seed: 42 },
      },
    );
    const state = exhaust(advanceBatch(exhaust(initialSession(source.input)), source.input));
    const snapshot = captureExperiment(
      d,
      split,
      pipeline.options,
      source.input.pipelineHash,
      source.input.config,
      state,
      0.5,
      1,
      false,
    );
    const restored = importExperiment(exportExperiment(snapshot));
    const prepared = prepareExperiment(restored);
    expect(exhaust(advanceBatch(restored.checkpoint, prepared.source.input))).toEqual(
      exhaust(advanceBatch(state, source.input)),
    );
  });
it('prefijos balanceados anidados conservan val/test y recuperan la selección por sus parámetros', () => {
  const d = dataset(),
    full = splitDataset(d, base);
  let previous: string[] = [];
  for (const count of [24, 48, 72]) {
    const split = splitDataset(d, { ...base, selection: { ...selection, count } });
    expect(split.validation).toEqual(full.validation);
    expect(split.test).toEqual(full.test);
    expect(split.train.slice(0, previous.length)).toEqual(previous);
    expect(split.train.every((id) => full.train.includes(id))).toBe(true);
    expect(Object.values(split.supportByClass).map((c) => c.train)).toEqual([count / 2, count / 2]);
    validateSplit(d, split);
    expect(split.splitHash).not.toBe(full.splitHash);
    previous = split.train;
  }
});
it('rechaza selecciones inválidas, pools desbalanceados y grupos en lugar de separar entidades', () => {
  const d = dataset();
  for (const patch of [
    { count: 3 },
    { count: 25 },
    { count: 74 },
    { count: NaN },
    { seed: -1 },
    { kind: 'other' },
  ])
    expect(() =>
      splitDataset(d, { ...base, selection: { ...selection, ...patch } as typeof selection }),
    ).toThrow();
  expect(() => splitDataset(d, { ...base, strategy: 'random', selection })).toThrow();
  const regression = generateDataset({ ...defaultGenerator, recipe: 'sine', count: 120 });
  expect(() => splitDataset(regression, { ...base, selection })).toThrow();
  d.rows[0]!.groupId = 'group-0';
  expect(() => splitDataset(d, { ...base, selection })).toThrow();
  const imbalanced = generateDataset({
    ...defaultGenerator,
    recipe: 'moons',
    count: 120,
    minority: 0.2,
  });
  expect(() => splitDataset(imbalanced, { ...base, selection })).toThrow('OPTIONS');
});
it('selección y filas manipuladas no pasan la validación determinista', () => {
  const d = dataset(),
    split = splitDataset(d, { ...base, selection });
  expect(() => validateSplit(d, { ...split, train: [...split.train].reverse() })).toThrow(
    'INTEGRITY',
  );
  expect(() => validateSplit(d, { ...split, selection: { ...selection, count: 48 } })).toThrow(
    'INTEGRITY',
  );
});
it('dataset v2 exige selección explícita y v1 permanece compatible sin ella', () => {
  const d = dataset(),
    split = splitDataset(d, { ...base, selection });
  const wire = JSON.parse(exportDatasetJson(d, split));
  expect(wire.schemaVersion).toBe(2);
  expect(importDatasetJson(JSON.stringify(wire)).split).toEqual(split);
  wire.schemaVersion = 1;
  expect(() => importDatasetJson(JSON.stringify(wire))).toThrow('SCHEMA');
  const old = JSON.parse(exportDatasetJson(d, splitDataset(d, base)));
  expect(old.schemaVersion).toBe(1);
  old.schemaVersion = 2;
  expect(() => importDatasetJson(JSON.stringify(old))).toThrow('SCHEMA');
  expect(importDatasetJson(exportDatasetJson(d)).dataset).toEqual(d);
});
it('pipeline aprende únicamente del prefijo, sin consultar filas omitidas ni validación', () => {
  const d = dataset(),
    split = splitDataset(d, { ...base, selection });
  const opts = {
    featureIds: ['x1', 'x2'],
    imputation: 'mean' as const,
    scaling: 'standard' as const,
    missingIndicators: false,
  };
  const a = fitPipeline(d, split, opts);
  for (const row of d.rows) if (!split.train.includes(row.id)) row.features.x1 = 1e6;
  const other = splitDataset(d, { ...base, selection });
  const b = fitPipeline(d, other, opts);
  expect(a.columns).toEqual(b.columns);
  expect(a.fittedOn).toEqual(b.fittedOn);
  expect(a.dataHash).not.toBe(b.dataHash);
});
it('capacidad: 27 ensayos reales, conteos de parámetros, semillas y presupuesto declarado', () => {
  const result = compareCapacity({ ...defaultCapacity, epochs: 5 });
  expect(result.trials).toHaveLength(27);
  expect(result.summary).toHaveLength(9);
  expect(result.summary.filter((s) => s.size === 24).map((s) => s.parameters)).toEqual([3, 9, 337]);
  for (const trial of result.trials) {
    const restored = importExperiment(exportExperiment(trial.run.experiment));
    const prepared = prepareExperiment(restored);
    expect(prepared.source.input.train.ids).toHaveLength(trial.size);
    expect(prepared.split.selection!.count).toBe(trial.size);
    expect(restored.checkpoint.updates).toBe((trial.size / 12) * 5);
    expect(restored.config.seed).toBe(trial.seed);
    expect(restored.testConsulted).toBe(false);
    const same = result.trials.filter(
      (t) => t.capacity === trial.capacity && t.seed === trial.seed,
    );
    expect(new Set(same.map((t) => t.run.initialHash)).size).toBe(1);
    const model = fromExperiment(restored);
    const imported = importInferenceModel(exportInferenceModel(model));
    expect(predictWithModel(imported, prepared.dataset.rows[0]!.features)).toEqual(
      predictWithModel(model, prepared.dataset.rows[0]!.features),
    );
  }
  const group = result.summary[0]!,
    trials = result.trials.filter((t) => t.size === group.size && t.capacity === group.capacity);
  const values = trials.map((t) => t.run.experiment.checkpoint.history.at(-1)!);
  expect(group.validation.mean).toBeCloseTo(
    values.reduce((s, p) => s + p.validationLoss, 0) / 3,
    14,
  );
  expect(group.gap.mean).toBeCloseTo(
    values.reduce((s, p) => s + p.validationLoss - p.trainLoss, 0) / 3,
    14,
  );
  const report = JSON.parse(exportCapacity(result));
  expect(report.format).toBe('neural-atlas.capacity-report');
  expect(report.measurements).toHaveLength(27);
  expect(report.testConsulted).toBe(false);
});
for (const recipe of ['circles', 'xor'] as const)
  it(`${recipe}: repetibilidad de estadísticas y vuelta uint32`, () => {
    const raw = { ...defaultCapacity, recipe, epochs: 5, firstSeed: 4294967295 };
    const a = compareCapacity(raw),
      b = compareCapacity(raw);
    expect(a.summary).toEqual(b.summary);
    expect(a.trials.slice(0, 3).map((t) => t.seed)).toEqual([4294967295, 0, 1]);
    expect(raw).toEqual({ ...defaultCapacity, recipe, epochs: 5, firstSeed: 4294967295 });
  });
it('valida el presupuesto antes del Worker y despacha errores cerrados', () => {
  expect(
    handleDataJob(1, { kind: 'capacity', payload: { ...defaultCapacity, epochs: 5 } }).ok,
  ).toBe(true);
  for (const patch of [{ repetitions: 10 }, { epochs: 121 }, { noise: NaN }, { recipe: 'flowers' }])
    expect(
      handleDataJob(2, {
        kind: 'capacity',
        payload: { ...defaultCapacity, ...patch } as typeof defaultCapacity,
      }).ok,
    ).toBe(false);
});
