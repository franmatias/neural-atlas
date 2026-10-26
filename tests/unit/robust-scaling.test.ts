import { describe, expect, it } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import { inferenceFixture } from '../fixtures/models';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import {
  exportExperiment,
  importExperiment,
  prepareExperiment,
} from '@/application/training/experiment';
import {
  exportInferenceModel,
  importInferenceModel,
  predictWithModel,
  validateInferenceModel,
} from '@/application/training/inference-model';
import { advanceBatch } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';

function sample(values: (number | null)[]) {
  const { dataset } = trainingFixture();
  dataset.features = [{ id: 'x', name: 'x', kind: 'numeric' }];
  dataset.rows.forEach((row) => (row.features = { x: 99999 }));
  const split = splitDataset(dataset, {
    strategy: 'stratified',
    seed: 42,
    ratios: [0.7, 0.15, 0.15],
  });
  dataset.rows.forEach((row) => (row.features = { x: 99999 }));
  split.train.forEach(
    (id, i) => (dataset.rows.find((row) => row.id === id)!.features.x = values[i % values.length]!),
  );
  // Recompute provenance after editing values, retaining deterministic membership.
  const fresh = splitDataset(dataset, {
    strategy: 'stratified',
    seed: 42,
    ratios: [0.7, 0.15, 0.15],
  });
  return { dataset, split: fresh };
}
const options = {
  featureIds: ['x'],
  imputation: 'median' as const,
  scaling: 'robust' as const,
  missingIndicators: true,
};
describe('Escalado robusto y archivos compatibles', () => {
  it('aprende cuartiles tipo 7 solo en train y no recorta las muestras externas', () => {
    const { dataset, split } = sample([0, 1, 2, 100]);
    const p = fitPipeline(dataset, split, options);
    const c = p.columns[0]!;
    expect(c.kind).toBe('numeric');
    if (c.kind !== 'numeric') throw Error('fixture');
    expect(c.robust).toEqual({ q1: 0.75, median: 1.5, q3: 26.5, iqr: 25.75 });
    expect(transformRow({ ...dataset.rows[0]!, features: { x: 1.5 } }, p)).toEqual([0, 0]);
    expect(transformRow({ ...dataset.rows[0]!, features: { x: null } }, p)).toEqual([0, 1]);
    expect(transformRow({ ...dataset.rows[0]!, features: { x: 99999 } }, p)[0]).toBeGreaterThan(
      1000,
    );
    split.validation
      .concat(split.test)
      .forEach((id) => (dataset.rows.find((r) => r.id === id)!.features.x = -1e8));
    const changed = splitDataset(dataset, {
      strategy: 'stratified',
      seed: 42,
      ratios: [0.7, 0.15, 0.15],
    });
    expect(fitPipeline(dataset, changed, options).columns).toEqual(p.columns);
  });
  it('calcula los cuartiles después de imputar y usa escala 1 cuando IQR es cero', () => {
    const { dataset, split } = sample([0, 0, null, 100]);
    const p = fitPipeline(dataset, split, options);
    expect(p.columns[0]).toMatchObject({ fill: 0, robust: { q1: 0, median: 0, q3: 25, iqr: 25 } });
    const zero = sample([1, 1, 1, 1, 1, 1, 1, 9]);
    const z = fitPipeline(zero.dataset, zero.split, options);
    expect(z.columns[0]).toMatchObject({ constant: false, robust: { median: 1, iqr: 0 } });
    expect(transformRow({ ...zero.dataset.rows[0]!, features: { x: 9 } }, z)).toEqual([8, 0]);
    const constant = sample([7]);
    const c = fitPipeline(constant.dataset, constant.split, options);
    expect(transformRow({ ...constant.dataset.rows[0]!, features: { x: 99 } }, c)).toEqual([0, 0]);
  });
  it.each(['moons', 'flowers', 'sine'] as const)(
    'reanuda exactamente y conserva predicción sin datos en %s',
    (recipe) => {
      const f = inferenceFixture(recipe, false, 'robust');
      expect(f.experiment.schemaVersion).toBe(7);
      const imported = importExperiment(exportExperiment(f.experiment));
      const recovered = prepareExperiment(imported);
      expect(exhaust(advanceBatch(imported.checkpoint, recovered.source.input))).toEqual(
        exhaust(advanceBatch(f.experiment.checkpoint, f.input)),
      );
      const model = importInferenceModel(exportInferenceModel(f.model));
      expect(model.schemaVersion).toBe(3);
      expect(model.pipeline.version).toBe(2);
      expect(predictWithModel(model, f.dataset.rows[0]!.features)).toEqual(
        predictWithModel(f.model, f.dataset.rows[0]!.features),
      );
      const wrongVersion = structuredClone(imported);
      wrongVersion.schemaVersion = 6;
      expect(() => prepareExperiment(wrongVersion)).toThrow('EXPERIMENT_VERSION');
    },
  );
  it('rechaza estadísticas robustas ausentes, incoherentes o disfrazadas de formato antiguo', () => {
    const { model } = inferenceFixture('moons', false, 'robust');
    for (const change of ['missing', 'iqr', 'median', 'version', 'legacy'] as const) {
      const m = structuredClone(model);
      const c = m.pipeline.columns[0]!;
      if (c.kind !== 'numeric') throw Error('fixture');
      if (change === 'missing') delete c.robust;
      if (change === 'iqr') c.robust!.iqr += 1;
      if (change === 'median') c.robust!.median = c.max + 1;
      if (change === 'version') m.pipeline.version = 1;
      if (change === 'legacy') m.schemaVersion = 1;
      expect(() => validateInferenceModel(m)).toThrow();
    }
    const old = inferenceFixture().model;
    expect(old.schemaVersion).toBe(1);
    expect(old.pipeline.version).toBe(1);
    expect(old.pipeline.columns.every((c) => !Object.hasOwn(c, 'robust'))).toBe(true);
    const c = old.pipeline.columns[0]!;
    if (c.kind !== 'numeric') throw Error('fixture');
    c.robust = { median: 0, q1: 0, q3: 1, iqr: 1 };
    expect(() => validateInferenceModel(old)).toThrow('MODEL_STATISTICS');
  });
});
