import { expect, it } from 'vitest';
import {
  binaryRecipes,
  multiRecipes,
  decisionDataset,
  prepareDecisionStudy,
  defaultDecisionOptions,
} from '@/application/training/decision-study';
import { validateDataset } from '@/domain/data/validation';
import { fitPipeline } from '@/domain/data/pipeline';
import { createNetwork } from '@/domain/network/model';
import { decisionAt, decisionSurface } from '@/domain/network/decision-surface';
import { initialSession, advanceBatch } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import {
  captureExperiment,
  exportExperiment,
  importExperiment,
} from '@/application/training/experiment';
import {
  modelFromExperiment,
  exportInferenceModel,
  importInferenceModel,
  predictWithModel,
} from '@/application/training/inference-model';

it('todas las recetas y clases son reproducibles y válidas, sin alterar opciones', () => {
  for (const mode of ['binary', 'multiclass'] as const)
    for (const recipe of mode === 'binary' ? binaryRecipes : multiRecipes)
      for (const classes of mode === 'binary' ? [2] : [3, 4]) {
        const options = { ...defaultDecisionOptions(mode), recipe, classes };
        const before = structuredClone(options),
          dataset = decisionDataset(mode, options);
        expect(dataset).toEqual(decisionDataset(mode, options));
        expect(() => validateDataset(dataset)).not.toThrow();
        expect(new Set(dataset.rows.map((r) => r.target)).size).toBe(classes);
        expect(options).toEqual(before);
        const study = prepareDecisionStudy(mode, options);
        expect(study.split.train).toHaveLength(144);
        expect(study.split.validation).toHaveLength(48);
        expect(study.split.test).toHaveLength(48);
        expect(study.prepared.pipeline.fittedOn.split).toBe('train');
      }
});
it('rechaza presupuestos, semillas, recetas y clases inválidos antes de entrenar', () => {
  const base = defaultDecisionOptions('multiclass');
  for (const invalid of [
    { classes: 2 },
    { classes: 5 },
    { noise: NaN },
    { noise: -1 },
    { noise: 0.41 },
    { seed: -1 },
    { recipe: 'moons' },
    { hidden: [17] },
    { hidden: [2, 2, 2, 2] },
    { epochs: 501 },
    { rate: 0 },
    { l2: 0.2 },
  ])
    expect(() => prepareDecisionStudy('multiclass', { ...base, ...invalid })).toThrow();
  expect(() =>
    prepareDecisionStudy('binary', { ...defaultDecisionOptions('binary'), recipe: 'blobs' }),
  ).toThrow();
});
it('el mapa tiene coordenadas raw, borde vertical correcto y presupuesto acotado', () => {
  const s = prepareDecisionStudy('binary', defaultDecisionOptions('binary'));
  const pipeline = fitPipeline(s.dataset, s.split, {
    ...s.prepared.pipeline.options,
    scaling: 'none',
  });
  const model = createNetwork({ ...s.source.input.config.spec, hidden: [] }, 42, 'zero');
  model.layers[0]!.weights.set([2, 0]);
  const surface = decisionSurface(model, pipeline, 10);
  expect(surface.cells).toHaveLength(100);
  expect(surface.cells[0]!.x).toBeCloseTo(-1.62);
  expect(surface.cells[0]!.y).toBeCloseTo(-1.62);
  expect(surface.cells.at(-1)!.y).toBeCloseTo(1.62);
  expect(surface.edges).toHaveLength(10);
  expect(surface.edges.every((e) => Math.abs(e.x1) < 1e-12 && Math.abs(e.x2) < 1e-12)).toBe(true);
  expect(decisionAt(model, pipeline, 1, 0).probabilities[1]).toBeCloseTo(1 / (1 + Math.exp(-2)));
  expect(decisionAt(model, pipeline, -1, 0).predicted).toBe(0);
  model.layers[0]!.weights.fill(0);
  expect(decisionSurface(model, pipeline).edges).toEqual([]);
  expect(decisionAt(model, pipeline, 0, 0).predicted).toBe(1);
  for (const resolution of [7, 49, 8.5])
    expect(() => decisionSurface(model, pipeline, resolution)).toThrow('SURFACE_BUDGET');
});
it.each(['binary', 'multiclass'] as const)(
  'aprende %s y exporta un checkpoint y modelo de la misma ejecución',
  (mode) => {
    const options = {
      ...defaultDecisionOptions(mode),
      recipe: mode === 'binary' ? 'clouds' : 'blobs',
      noise: 0.03,
      epochs: 15,
    };
    const s = prepareDecisionStudy(mode, options);
    let state = exhaust(initialSession(s.source.input));
    const initial = state.history[0]!.trainLoss;
    while (state.epoch < options.epochs) state = exhaust(advanceBatch(state, s.source.input));
    expect(state.history.at(-1)!.trainLoss).toBeLessThan(initial * 0.3);
    expect(state.history.at(-1)!.validationScore).toBeGreaterThan(0.9);
    const e = captureExperiment(
      s.dataset,
      s.split,
      s.prepared.pipeline.options,
      s.source.input.pipelineHash,
      s.source.input.config,
      state,
      0.5,
      1,
      false,
    );
    expect(importExperiment(exportExperiment(e)).checkpoint).toEqual(state);
    const model = importInferenceModel(exportInferenceModel(modelFromExperiment(e)));
    const probe = decisionAt(state.model, s.prepared.pipeline, 0.85, 0);
    const predicted = predictWithModel(model, { x1: 0.85, x2: 0 });
    expect(
      mode === 'binary' ? [1 - predicted.output[0]!, predicted.output[0]!] : predicted.output,
    ).toEqual(probe.probabilities);
    expect(probe.probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 14);
    expect(
      decisionSurface(state.model, s.prepared.pipeline).cells.every((c) =>
        c.probabilities.every(Number.isFinite),
      ),
    ).toBe(true);
  },
);
it('los puntos manuales se conservan y sus particiones son explícitas', () => {
  const options = defaultDecisionOptions('multiclass');
  const point = {
    id: 'manual-1',
    features: { x1: 0, x2: 0 },
    target: '3',
    origin: 'manual' as const,
  };
  const s = prepareDecisionStudy('multiclass', options, [point]);
  expect(s.dataset.rows.at(-1)).toEqual(point);
  expect(
    [...s.split.train, ...s.split.validation, ...s.split.test].filter((id) => id === point.id),
  ).toHaveLength(1);
  expect(() => prepareDecisionStudy('multiclass', { ...options, classes: 3 }, [point])).toThrow();
});
