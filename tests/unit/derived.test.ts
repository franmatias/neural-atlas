import { splitDataset } from '@/domain/data/split';
import { expect, it } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import type { DerivedFeature } from '@/domain/data/derived';
import { trainingSource } from '@/application/training/source';
import {
  captureExperiment,
  importExperiment,
  exportExperiment,
  prepareExperiment,
} from '@/application/training/experiment';
import {
  modelFromExperiment,
  importInferenceModel,
  exportInferenceModel,
  predictWithModel,
  validateInferenceModel,
} from '@/application/training/inference-model';
import { initialSession, advanceBatch } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
const definitions: DerivedFeature[] = [
  { id: 'square', operation: 'square', sources: ['x1'] },
  { id: 'cross', operation: 'product', sources: ['x1', 'x2'] },
  { id: 'log', operation: 'log1p', sources: ['x1'] },
];
it('deriva sobre los originales imputados, antes de escalar, sin aprender de val/test', () => {
  const f = trainingFixture();
  f.dataset.rows.forEach((r) => (r.features.x1 = Math.abs(r.features.x1 as number) + 0.05));
  f.split = splitDataset(f.dataset, {
    strategy: 'stratified',
    seed: 42,
    ratios: [0.7, 0.15, 0.15],
  });
  const options = {
    ...f.prepared.pipeline.options,
    scaling: 'none' as const,
    derived: definitions,
  };
  const p = fitPipeline(f.dataset, f.split, options);
  const row = { ...f.dataset.rows[0]!, features: { x1: 0.5, x2: 2 } };
  expect(transformRow(row, p)).toEqual([0.5, 2, 0.25, 1, Math.log1p(0.5)]);
  const missing = transformRow({ ...row, features: { x1: null, x2: 2 } }, p),
    c = p.columns[0]!;
  expect(missing[2]).toBe(Number(c.fill) ** 2);
  expect(p.derived![0]!.mean).toBeCloseTo(
    f.split.train
      .map((id) => f.dataset.rows.find((r) => r.id === id)!.features.x1 as number)
      .reduce((s, v) => s + v * v, 0) / f.split.train.length,
    14,
  );
  expect(() => transformRow({ ...row, features: { x1: -1, x2: 2 } }, p)).toThrow('PIPELINE');
});
it.each(['none', 'standard', 'minmax', 'robust'] as const)(
  'reproduce experimento y modelo con %s y dimensiones derivadas',
  (scaling) => {
    const f = trainingFixture();
    const pipeline = fitPipeline(f.dataset, f.split, {
      ...f.prepared.pipeline.options,
      scaling,
      derived: definitions.slice(0, 2),
    });
    const source = trainingSource(
      f.dataset,
      f.split,
      { pipeline, matrix: f.dataset.rows.map((r) => transformRow(r, pipeline)) },
      f.config,
    );
    const state = exhaust(advanceBatch(exhaust(initialSession(source.input)), source.input));
    const e = captureExperiment(
      f.dataset,
      f.split,
      pipeline.options,
      source.input.pipelineHash,
      source.input.config,
      state,
      0.5,
      1,
      false,
    );
    expect(e.schemaVersion).toBe(8);
    const copy = importExperiment(exportExperiment(e)),
      prepared = prepareExperiment(copy);
    expect(exhaust(advanceBatch(copy.checkpoint, prepared.source.input))).toEqual(
      exhaust(advanceBatch(state, source.input)),
    );
    const model = importInferenceModel(exportInferenceModel(modelFromExperiment(e)));
    expect(model.schemaVersion).toBe(4);
    expect(model.pipeline.version).toBe(3);
    expect(predictWithModel(model, f.dataset.rows[0]!.features).transformed).toEqual(
      transformRow(f.dataset.rows[0]!, pipeline),
    );
    model.pipeline.derived![0]!.id = 'wrong';
    expect(() => validateInferenceModel(model)).toThrow('MODEL_FEATURES');
  },
);
it('rechaza orígenes no seleccionados, ciclos, operaciones libres, duplicados y exceso', () => {
  const f = trainingFixture();
  for (const derived of [
    [],
    [definitions[0]!, definitions[0]!],
    [{ id: 'bad', operation: 'square', sources: ['target'] }],
    [{ id: 'bad', operation: 'square', sources: ['square'] }],
    [{ id: 'bad', operation: 'eval', sources: ['x1'] }],
    Array.from({ length: 9 }, (_, i) => ({ ...definitions[0]!, id: `d${i}` })),
  ])
    expect(() =>
      fitPipeline(f.dataset, f.split, {
        ...f.prepared.pipeline.options,
        derived: derived as DerivedFeature[],
      }),
    ).toThrow();
});
