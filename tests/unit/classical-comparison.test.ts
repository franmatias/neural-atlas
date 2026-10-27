import { it, expect } from 'vitest';
import {
  compareClassical,
  defaultClassicalOptions,
} from '@/application/training/classical-comparison';
import { importEstimator, predictEstimatorFile } from '@/application/training/classical-files';
import { importInferenceModel } from '@/application/training/inference-model';
import { hashValue } from '@/domain/data/integrity';
import { importDatasetJson, exportDatasetJson } from '@/application/data/json-files';
import { trainingFixture } from '../fixtures/training';
import { splitDataset } from '@/domain/data/split';
import { fitTrainingPipeline } from '@/domain/data/pipeline';
import { handleDataJob } from '@/application/data/jobs';
it.each(['moons', 'flowers', 'sine'] as const)(
  'mismos IDs/pipeline, métricas y archivos de familia en %s',
  (recipe) => {
    const result = compareClassical({ ...defaultClassicalOptions, recipe, epochs: 5 });
    expect(result.runs).toHaveLength(3);
    expect(result.testEvaluated).toBe(false);
    expect(result.operations).toBeLessThanOrEqual(1e8);
    expect(result.grid).toHaveLength(result.axes.length === 1 ? 81 : 625);
    expect(result.runs[0]!.metrics.kind).toBe(recipe === 'sine' ? 'regression' : 'classification');
    const nn = importInferenceModel(result.artifacts.mlp);
    expect(nn.hashes.pipelineHash).toBe(hashValue(result.pipeline));
    for (const family of ['knn', 'cart'] as const) {
      const model = importEstimator(result.artifacts[family]);
      expect(model.model.family).toBe(family);
      expect(model.model.data.ids).toEqual(result.trainIds);
      expect(hashValue(model.pipeline)).toBe(hashValue(result.pipeline));
      expect(model.trainingDataset.rows.some((r) => result.validationIds.includes(r.id))).toBe(
        false,
      );
      expect(predictEstimatorFile(result.artifacts[family], result.probe.features).values).toEqual(
        result.probe[family].values,
      );
      expect(() => importInferenceModel(result.artifacts[family])).toThrow();
    }
    expect(
      handleDataJob(1, { kind: 'classicalFile', payload: { text: result.artifacts.knn } }).ok,
    ).toBe(true);
    expect(
      handleDataJob(2, {
        kind: 'classicalProbe',
        payload: { artifacts: result.artifacts, features: result.probe.features },
      }).ok,
    ).toBe(true);
  },
);
it('el holdout extremo no cambia el ajuste, y el archivo no conserva sus filas', () => {
  const f = trainingFixture('moons', 40),
    options = {
      ...defaultClassicalOptions,
      epochs: 5,
      datasetJson: exportDatasetJson(f.dataset, f.split),
    };
  const a = compareClassical(options),
    changed = structuredClone(f.dataset);
  for (const row of changed.rows.filter((r) => f.split.test.includes(r.id))) {
    row.features.x1 = 100000;
  }
  // Preserve membership with a real deterministic split recreated for the changed dataset.
  const changedSplit = splitDataset(changed, {
    strategy: f.split.strategy,
    ratios: f.split.ratios,
    seed: f.split.seed,
  });
  const b = compareClassical({ ...options, datasetJson: exportDatasetJson(changed, changedSplit) });
  expect(b.trainIds).toEqual(a.trainIds);
  expect(b.pipeline.columns).toEqual(a.pipeline.columns);
  expect(importEstimator(b.artifacts.knn).model.data).toEqual(
    importEstimator(a.artifacts.knn).model.data,
  );
  expect(importInferenceModel(b.artifacts.mlp).network).toEqual(
    importInferenceModel(a.artifacts.mlp).network,
  );
  const original = importDatasetJson(options.datasetJson).dataset;
  expect(a.trainIds).toEqual(f.split.train);
  const trainModel = importEstimator(a.artifacts.knn);
  expect(trainModel.trainingDataset.rows).toHaveLength(f.split.train.length);
  expect(trainModel.trainingDataset.rows.map((r) => r.id)).not.toContain(f.split.test[0]);
  expect(
    fitTrainingPipeline(original, f.split.train, f.prepared.pipeline.options, {
      dataHash: f.split.dataHash,
      splitHash: f.split.splitHash,
    }),
  ).toEqual(f.prepared.pipeline);
  expect(() =>
    fitTrainingPipeline(original, ['missing'], f.prepared.pipeline.options, {
      dataHash: f.split.dataHash,
      splitHash: f.split.splitHash,
    }),
  ).toThrow();
  expect(() =>
    fitTrainingPipeline(original, f.split.train, f.prepared.pipeline.options, {
      dataHash: 'bad',
      splitHash: 'bad',
    }),
  ).toThrow();
});
it('integridad, estado aprendido manipulado y entradas incorrectas se rechazan', () => {
  const r = compareClassical({ ...defaultClassicalOptions, epochs: 5 });
  const raw = JSON.parse(r.artifacts.cart) as Record<string, unknown>;
  raw.learned = { fake: true };
  expect(() => importEstimator(JSON.stringify(raw))).toThrow('INTEGRITY');
  const { integrity: _, ...payload } = raw;
  void _;
  expect(() =>
    importEstimator(JSON.stringify({ ...payload, integrity: hashValue(payload) })),
  ).toThrow('FIT');
  expect(() => importEstimator(' '.repeat(8 * 1024 * 1024 + 1))).toThrow('SIZE');
  expect(() => importEstimator('{"__proto__":{}}')).toThrow();
  expect(() => predictEstimatorFile(r.artifacts.knn, {})).toThrow('INPUT');
  expect(() => predictEstimatorFile(r.artifacts.knn, { ...r.probe.features, x1: 'bad' })).toThrow(
    'INPUT',
  );
  expect(() => compareClassical({ ...defaultClassicalOptions, k: 100 })).toThrow();
  expect(() =>
    compareClassical({
      ...defaultClassicalOptions,
      datasetJson: exportDatasetJson(trainingFixture().dataset),
    }),
  ).toThrow('SPLIT');
  expect(
    handleDataJob(9, {
      kind: 'classicalComparison',
      payload: { ...defaultClassicalOptions, k: 100 },
    }).ok,
  ).toBe(false);
});
it('una característica produce curva, solo categorías usa tabla y la consulta previa de test no se borra', () => {
  const f = trainingFixture('sine', 40),
    one = structuredClone(f.dataset);
  delete one.recipe;
  one.features = one.features.slice(0, 1);
  for (const row of one.rows)
    row.features = { [one.features[0]!.id]: row.features[one.features[0]!.id]! };
  const split = splitDataset(one, { strategy: 'random', seed: 42, ratios: [0.7, 0.15, 0.15] });
  const result = compareClassical({
    ...defaultClassicalOptions,
    epochs: 5,
    datasetJson: exportDatasetJson(one, split),
    testPreviouslyConsulted: true,
  });
  expect(result.grid).toHaveLength(81);
  expect(importInferenceModel(result.artifacts.mlp).training.testConsulted).toBe(true);
  expect(importEstimator(result.artifacts.knn).provenance.testPreviouslyConsulted).toBe(true);
  const c = trainingFixture('moons', 40).dataset;
  delete c.recipe;
  for (const feature of c.features) {
    feature.kind = 'categorical';
    for (const row of c.rows)
      row.features[feature.id] = Number(row.features[feature.id]) >= 0 ? 'positivo' : 'negativo';
  }
  const categoric = compareClassical({
    ...defaultClassicalOptions,
    epochs: 5,
    datasetJson: exportDatasetJson(
      c,
      splitDataset(c, { strategy: 'stratified', ratios: [0.7, 0.15, 0.15], seed: 42 }),
    ),
  });
  expect(categoric.axes).toHaveLength(0);
  expect(categoric.grid).toHaveLength(0);
});
