import { it, expect } from 'vitest';
import { functionValue, functionContributions } from '@/domain/network/function-approximation';
import { createNetwork, defaultSpec, forward, type TrainActivation } from '@/domain/network/model';
import {
  approximateFunction,
  functionDataset,
  functionExperiment,
  exportFunctionReport,
  defaultFunctionOptions,
  functionWidths,
} from '@/application/training/function-approximation';
import { hashValue } from '@/domain/data/integrity';
import {
  exportExperiment,
  importExperiment,
  prepareExperiment,
} from '@/application/training/experiment';
import { advanceBatch } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import {
  exportInferenceModel,
  importInferenceModel,
  modelFromExperiment,
  predictWithModel,
} from '@/application/training/inference-model';

it('funciones conocidas y dos ReLU construyen |x| con términos independientes', () => {
  expect(functionValue('sine', 0.5)).toBe(1);
  expect(functionValue('sine', -0.5)).toBe(-1);
  expect(functionValue('absolute', -0.7)).toBe(0.7);
  expect(functionValue('step', -0.001)).toBe(0);
  expect(functionValue('step', 0)).toBe(1);
  const model = createNetwork(
    { ...defaultSpec, inputs: 1, hidden: [2], task: 'regression', activation: 'relu' },
    42,
  );
  model.layers[0]!.weights.set([1, -1]);
  model.layers[0]!.biases.fill(0);
  model.layers[1]!.weights.set([1, 1]);
  model.layers[1]!.biases.fill(0);
  for (const x of [-1, -0.6, 0, 0.4, 1]) {
    const parts = functionContributions(model, x);
    expect(parts.prediction).toBe(Math.abs(x));
    expect(parts.sum).toBe(parts.prediction);
    expect(parts.terms.map((t) => t.contribution)).toEqual([Math.max(0, x), Math.max(0, -x)]);
  }
  model.layers[1]!.biases[0] = 0.25;
  expect(functionContributions(model, -0.5)).toMatchObject({
    bias: 0.25,
    prediction: 0.75,
    sum: 0.75,
  });
});
it('suma exacta y no linealidad se comprueban en todas las anchuras y activaciones', () => {
  for (const width of functionWidths)
    for (const activation of ['tanh', 'relu', 'sigmoid', 'linear'] as TrainActivation[]) {
      const model = createNetwork(
        { ...defaultSpec, inputs: 1, hidden: [width], activation, task: 'regression' },
        31,
      );
      for (const x of [-1, -0.17, 0, 0.43, 1]) {
        const p = functionContributions(model, x);
        expect(p.terms).toHaveLength(width);
        expect(p.sum).toBe(p.prediction);
        expect(p.prediction).toBe(forward(model, [x]).activations.at(-1)![0]);
      }
      if (activation === 'linear')
        expect(
          functionContributions(model, -0.5).prediction +
            functionContributions(model, 0.5).prediction,
        ).toBeCloseTo(2 * functionContributions(model, 0).prediction, 13);
    }
});
it('streams de posiciones y ruido son reproducibles y σ conserva entradas y membresía', () => {
  const clean = functionDataset(defaultFunctionOptions),
    noisy = functionDataset({ ...defaultFunctionOptions, noise: 0.1 }),
    twice = functionDataset({ ...defaultFunctionOptions, noise: 0.2 });
  expect(clean.dataset.rows).toHaveLength(240);
  expect([
    clean.split.train.length,
    clean.split.validation.length,
    clean.split.test.length,
  ]).toEqual([144, 48, 48]);
  expect(noisy.split.train).toEqual(clean.split.train);
  expect(noisy.split.test).toEqual(clean.split.test);
  expect(functionDataset({ ...defaultFunctionOptions, noise: 0.1 })).toEqual(noisy);
  clean.dataset.rows.forEach((row, i) => {
    expect(noisy.dataset.rows[i]!.features).toEqual(row.features);
    expect(Number(twice.dataset.rows[i]!.target) - Number(row.target)).toBeCloseTo(
      2 * (Number(noisy.dataset.rows[i]!.target) - Number(row.target)),
      14,
    );
    expect(noisy.dataset.rows[i]!.annotation?.cleanTarget).toBe(row.target);
    expect(noisy.dataset.rows[i]!.annotation?.defects).toEqual(['noise']);
  });
});
it('cuatro anchuras comparten datos y presupuesto de actualizaciones, no parámetros ni pesos', () => {
  const result = approximateFunction({ ...defaultFunctionOptions, compare: true, epochs: 5 });
  expect(result.runs.map((r) => r.width)).toEqual([1, 2, 8, 32]);
  expect(result.runs.map((r) => r.budget.parameters)).toEqual([4, 7, 25, 97]);
  expect(result.testEvaluated).toBe(false);
  expect(result.estimatedOperations).toBeLessThan(2e8);
  expect(result.pipeline.fittedOn.idsHash).toBe(hashValue(result.split.train));
  expect(result.pipeline.options.scaling).toBe('none');
  for (const run of result.runs) {
    expect(run.snapshots[0]!.checkpoint.epoch).toBe(0);
    expect(run.snapshots.at(-1)!.checkpoint.updates).toBe(45);
    expect(run.snapshots.at(-1)!.checkpoint.epoch).toBe(5);
    expect(run.snapshots).toHaveLength(6);
    expect(run.snapshots[0]!.checkpoint.model.layers[0]!.weights).not.toEqual(
      run.snapshots.at(-1)!.checkpoint.model.layers[0]!.weights,
    );
    for (const snap of run.snapshots) {
      expect(snap.curve).toHaveLength(241);
      expect(snap.checkpoint.cursor).toBe(0);
      expect(snap.point.epoch).toBe(snap.checkpoint.epoch);
      expect(snap.point.update).toBe(snap.checkpoint.updates);
      for (const p of snap.curve)
        expect(
          p.contributions.reduce(
            (s, term) => s + term,
            snap.checkpoint.model.layers[1]!.biases[0]!,
          ),
        ).toBe(p.prediction);
    }
  }
});
it('seno aprende y las capturas son independientes, repetibles y no interpoladas', () => {
  const result = approximateFunction(defaultFunctionOptions),
    run = result.runs[0]!;
  expect(run.snapshots.length).toBeLessThanOrEqual(13);
  expect(run.snapshots.at(-1)!.gridMse).toBeLessThan(run.snapshots[0]!.gridMse * 0.3);
  expect(run.snapshots.map((s) => s.checkpoint.epoch)).toEqual([
    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
  ]);
  const other = approximateFunction(defaultFunctionOptions);
  expect(other.runs[0]!.snapshots.at(-1)!.curve).toEqual(run.snapshots.at(-1)!.curve);
  expect(run.snapshots[0]!.checkpoint.model.layers[0]!.weights).not.toBe(
    run.snapshots[1]!.checkpoint.model.layers[0]!.weights,
  );
});
it('escalón conserva cota del supremo y |x| conserva métricas limpias independientes del ruido', () => {
  for (const kind of ['step', 'absolute'] as const) {
    const result = approximateFunction({ ...defaultFunctionOptions, kind, noise: 0.2, epochs: 5 });
    for (const snap of result.runs[0]!.snapshots) {
      const gridMse = snap.curve.reduce(
        (s, p) => s + (p.prediction - functionValue(kind, p.x)) ** 2 / 241,
        0,
      );
      expect(snap.gridMse).toBe(gridMse);
      if (kind === 'step') {
        expect(snap.jumpLowerBound).toBeGreaterThanOrEqual(0.5);
        const zero = snap.curve[120]!.prediction;
        expect(snap.jumpLowerBound).toBe(Math.max(Math.abs(zero), Math.abs(zero - 1)));
      } else expect(snap.jumpLowerBound).toBe(null);
    }
  }
});
it('instantánea intermedia reanuda el siguiente lote idéntico y exporta inferencia independiente', () => {
  const result = approximateFunction({ ...defaultFunctionOptions, epochs: 5 });
  const experiment = functionExperiment(result, 0, 1),
    restored = importExperiment(exportExperiment(experiment));
  const input = prepareExperiment(experiment).source.input,
    other = prepareExperiment(restored).source.input;
  const a = exhaust(advanceBatch(experiment.checkpoint, input)),
    b = exhaust(advanceBatch(restored.checkpoint, other));
  expect(b).toEqual(a);
  expect(a.updates).toBe(10);
  const model = importInferenceModel(exportInferenceModel(modelFromExperiment(experiment)));
  expect(predictWithModel(model, { x: 0.23 }).output[0]).toBe(
    functionContributions(experiment.checkpoint.model, 0.23).prediction,
  );
  const report = JSON.parse(
    exportFunctionReport(result, { run: 0, snapshot: 1, x: 0.23 }, 'Explicación'),
  );
  expect(report).toMatchObject({
    format: 'neural-atlas.function-approximation-report',
    schemaVersion: 1,
    reflection: 'Explicación',
    testEvaluated: false,
  });
  expect(report.runs[0].snapshots[0].model.layers[0].weights).toBeInstanceOf(Array);
  expect(importExperiment(JSON.stringify(report.runs[0].finalExperiment)).checkpoint.epoch).toBe(5);
});
it('rechaza dominios, modelos, configuraciones libres y selecciones inválidas', () => {
  for (const x of [NaN, Infinity, -1.1, 1.1]) expect(() => functionValue('sine', x)).toThrow();
  expect(() => functionValue('eval' as never, 0)).toThrow();
  for (const spec of [
    defaultSpec,
    { ...defaultSpec, inputs: 1, task: 'regression' as const, hidden: [] },
    { ...defaultSpec, inputs: 1, task: 'regression' as const, hidden: [2, 2] },
    { ...defaultSpec, inputs: 1, task: 'regression' as const, batchNormalization: true as const },
  ])
    expect(() => functionContributions(createNetwork(spec, 42), 0)).toThrow();
  const model = createNetwork({ ...defaultSpec, inputs: 1, task: 'regression', hidden: [2] }, 42);
  expect(() => functionContributions(model, Infinity)).toThrow();
  model.layers[1]!.activation = 'sigmoid';
  expect(() => functionContributions(model, 0)).toThrow();
  for (const change of [
    { width: 4 },
    { noise: -1 },
    { noise: 0.31 },
    { seed: -1 },
    { epochs: 4 },
    { epochs: 121 },
    { rate: 0 },
    { activation: 'step' },
    { freeCode: 'sin(x)' },
  ])
    expect(() => approximateFunction({ ...defaultFunctionOptions, ...change } as never)).toThrow();
  const result = approximateFunction({ ...defaultFunctionOptions, epochs: 5 });
  for (const [r, s] of [
    [-1, 0],
    [0, -1],
    [0, 100],
    [0.5, 0],
    [0, 0.5],
  ])
    expect(() => functionExperiment(result, r!, s!)).toThrow();
});
