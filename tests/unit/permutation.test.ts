import { it, expect } from 'vitest';
import {
  measurePermutation,
  permuteRows,
  permutationStudy,
  defaultPermutation,
  exportPermutationReport,
} from '@/application/training/permutation';
import { modelFromExperiment, importInferenceModel } from '@/application/training/inference-model';
import { trainStudyRun } from '@/application/training/study-run';
import { exportExperiment } from '@/application/training/experiment';
import { networkWire } from '@/application/training/network-schema';
import { hashValue } from '@/domain/data/integrity';
import { trainingFixture } from '../fixtures/training';
import { splitDataset } from '@/domain/data/split';
import { handleDataJob } from '@/application/data/jobs';
function linear(derived = false) {
  const f = trainingFixture('sine', 40),
    pipeline = {
      ...f.prepared.pipeline.options,
      scaling: 'none' as const,
      ...(derived
        ? { derived: [{ id: 'product', operation: 'product' as const, sources: ['x1', 'x2'] }] }
        : {}),
    };
  const run = trainStudyRun(
    f.dataset,
    f.split,
    { ...f.config, epochs: 5, spec: { ...f.config.spec, hidden: [] } },
    'Oráculo',
    pipeline,
  );
  const m = modelFromExperiment(run.experiment);
  m.network.layers[0]!.weights.set(derived ? [0, 0, 1] : [1, 0]);
  m.network.layers[0]!.biases.fill(0);
  m.hashes.networkHash = hashValue(networkWire(m.network));
  return { model: m, f, run };
}
it('oráculo lineal, variable ignorada, dispersión exacta, negativos e inmutabilidad', () => {
  const { model } = linear();
  const rows = [
    { id: 'a', origin: 'manual' as const, features: { x1: -1, x2: 4 }, target: -1 },
    { id: 'b', origin: 'manual' as const, features: { x1: 1, x2: 4 }, target: 1 },
  ];
  const before = JSON.stringify({
      model: networkWire(model.network),
      pipeline: model.pipeline,
      rows,
    }),
    r = measurePermutation(model, rows, 42, 5);
  expect(r.baseline.loss).toBe(0);
  expect(r.results[1]!.trials.every((t) => t.delta === 0)).toBe(true);
  const oracle: number[] = r.results[0]!.trials.map((t) => (t.order[0] === 0 ? 0 : 4)),
    mean = oracle.reduce((s, x) => s + x / 5, 0);
  expect(r.results[0]!.trials.map((t) => t.delta)).toEqual(oracle);
  expect(r.results[0]!.mean).toBe(mean);
  expect(r.results[0]!.deviation).toBeCloseTo(
    Math.sqrt(oracle.reduce((s, x) => s + (x - mean) ** 2, 0) / 4),
  );
  expect(
    JSON.stringify({ model: networkWire(model.network), pipeline: model.pipeline, rows }),
  ).toBe(before);
  expect(
    measurePermutation(
      model,
      rows.map((r) => ({ ...r, target: -r.target })),
      42,
      5,
    ).results[0]!.mean,
  ).toBeLessThan(0);
  expect(measurePermutation(model, rows, 42, 5)).toEqual(r);
});
it('recalcula producto derivado a partir de la columna cruda sin cambiar la otra', () => {
  const { model } = linear(true);
  const rows = [
    { id: 'a', origin: 'manual' as const, features: { x1: 1, x2: 2 }, target: 2 },
    { id: 'b', origin: 'manual' as const, features: { x1: 3, x2: 4 }, target: 12 },
  ];
  const r = measurePermutation(model, rows, 3, 5);
  expect(r.baseline.loss).toBe(0);
  for (const t of r.results[0]!.trials) {
    expect(t.loss).toBe(t.order[0] === 0 ? 0 : 40);
  }
});
it('baraja categorías y nulos como valores, preservando etiquetas, IDs y multiconjunto', () => {
  const rows = Array.from({ length: 8 }, (_, i) => ({
    id: 'r' + i,
    origin: 'manual' as const,
    features: { cat: i % 3 === 0 ? null : String(i % 2), other: i },
    target: i,
  }));
  const before = structuredClone(rows);
  const p = permuteRows(rows, 'cat', 42, 1);
  expect(p.rows.map((r) => r.features.cat).sort()).toEqual(rows.map((r) => r.features.cat).sort());
  expect(p.rows.map((r) => [r.id, r.features.other, r.target])).toEqual(
    rows.map((r) => [r.id, r.features.other, r.target]),
  );
  expect(rows).toEqual(before);
  expect(() => permuteRows(rows, 'missing', 42, 0)).toThrow();
  expect(() => permuteRows(rows, 'cat', 42, 10)).toThrow();
});
it.each(['moons', 'flowers', 'sine', 'correlated'] as const)(
  'estudio %s y archivos sin filas crudas',
  (recipe) => {
    const result = permutationStudy({ ...defaultPermutation, recipe, epochs: 5 }),
      model = importInferenceModel(result.model);
    expect(result.results).toHaveLength(['correlated', 'flowers'].includes(recipe) ? 3 : 2);
    expect(result.testEvaluated).toBe(false);
    expect(model.hashes.pipelineHash).toBe(result.provenance.pipelineHash);
    expect(model.hashes.networkHash).toBe(result.provenance.networkHash);
    const report = JSON.parse(exportPermutationReport(result));
    expect(report.rows).toBeUndefined();
    expect(report.model).toBeUndefined();
    expect(report.results[0].trials[0].order).toBeUndefined();
    expect(report.results[0].trials[0].losses).toBeUndefined();
    expect(report.baseline.loss).toBe(result.baseline.loss);
    expect(
      handleDataJob(1, {
        kind: 'permutation',
        payload: { ...defaultPermutation, recipe, epochs: 5 },
      }).ok,
    ).toBe(true);
  },
);
it('checkpoint real, consulta previa y test extremo no cambian red ni importancias', () => {
  const f = trainingFixture('sine', 40),
    run = trainStudyRun(
      f.dataset,
      f.split,
      { ...f.config, epochs: 5 },
      'Original',
      undefined,
      true,
    );
  const a = permutationStudy({
    ...defaultPermutation,
    experimentJson: exportExperiment(run.experiment),
  });
  expect(a.source).toBe('checkpoint');
  expect(a.provenance.testPreviouslyConsulted).toBe(true);
  const changed = structuredClone(f.dataset);
  for (const row of changed.rows) if (f.split.test.includes(row.id)) row.features.x1 = 10000;
  const split = splitDataset(changed, {
    strategy: f.split.strategy,
    seed: f.split.seed,
    ratios: f.split.ratios,
  });
  const other = trainStudyRun(changed, split, { ...f.config, epochs: 5 }, 'Otro', undefined, true);
  const b = permutationStudy({
    ...defaultPermutation,
    experimentJson: exportExperiment(other.experiment),
  });
  expect(b.results).toEqual(a.results);
  expect(b.baseline).toEqual(a.baseline);
  expect(b.provenance.networkHash).toBe(a.provenance.networkHash);
});
it('límites, modelo alterado, objetivos inválidos y fuente maliciosa', () => {
  const { model, f } = linear();
  for (const n of [0, 1, 11])
    expect(() => measurePermutation(model, f.dataset.rows, 42, n)).toThrow();
  expect(() => measurePermutation(model, f.dataset.rows.slice(0, 1), 42, 5)).toThrow();
  expect(() =>
    measurePermutation(model, [f.dataset.rows[0]!, f.dataset.rows[0]!], 42, 5),
  ).toThrow();
  expect(() =>
    measurePermutation(
      model,
      f.dataset.rows.map((r) => ({ ...r, target: null })),
      42,
      5,
    ),
  ).toThrow();
  const bad = structuredClone(model);
  bad.network.layers[0]!.weights[0] = 999;
  expect(() => measurePermutation(bad, f.dataset.rows, 42, 5)).toThrow();
  expect(() => permutationStudy({ ...defaultPermutation, experimentJson: '{}' })).toThrow();
  const extreme = structuredClone(model);
  extreme.task = 'binary';
  extreme.network.spec.task = 'binary';
  extreme.classOrder = ['0', '1'];
  extreme.positiveClassId = 1;
  extreme.threshold = 0.5;
  extreme.network.layers[0]!.activation = 'sigmoid';
  extreme.network.layers[0]!.weights.set([1e200, 0]);
  extreme.hashes.networkHash = hashValue(networkWire(extreme.network));
  expect(() =>
    measurePermutation(
      extreme,
      [
        { id: 'a', origin: 'manual', features: { x1: -1, x2: 0 }, target: '1' },
        { id: 'b', origin: 'manual', features: { x1: 1, x2: 0 }, target: '0' },
      ],
      42,
      5,
    ),
  ).toThrow('PERMUTATION_NON_FINITE');
  expect(() =>
    permutationStudy({ ...defaultPermutation, experimentJson: ' '.repeat(8 * 1024 * 1024 + 1) }),
  ).toThrow();
});
