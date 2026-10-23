import { describe, expect, it } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import { createNetwork, defaultSpec, forward } from '@/domain/network/model';
import { backward, batchGradient, applyGradient } from '@/domain/network/backprop';
import { forwardChunks, backwardChunks, exhaust } from '@/domain/training/kernel';
import {
  createOptimizer,
  defaultOptimizer,
  learningRate,
  optimizerStep,
  parameterVectors,
  validateOptimizer,
  validateOptimizerState,
  type OptimizerKind,
} from '@/domain/training/optimizer';
import {
  advanceBatch,
  cloneState,
  initialSession,
  validateCheckpoint,
  validateTraining,
  validateSamples,
  diagnostics,
  type TrainingInput,
} from '@/domain/training/session';
import { classificationMetrics, regressionMetrics } from '@/domain/training/metrics';
import oracle from '../../docs/fixtures/review-math.json';
import { trainingBudget } from '@/domain/training/budget';

describe('motor de entrenamiento cooperativo', () => {
  it('SGD promedia una sola vez y coincide con un paso de lote del motor D3', () => {
    const { input } = trainingFixture();
    input.config.optimizer.kind = 'sgd';
    input.config.batchSize = input.train.ids.length;
    const initial = exhaust(initialSession(input));
    const indices = initial.order;
    const gradient = batchGradient(
      initial.model,
      indices.map((i) => input.train.x[i]!),
      indices.map((i) => input.train.y[i]!),
      input.config.loss,
    );
    const expected = applyGradient(initial.model, gradient.gradient, input.config.optimizer.rate);
    const next = exhaust(advanceBatch(initial, input));
    expect(next.model).toEqual(expected);
    expect(next.updates).toBe(1);
    expect(next.epoch).toBe(1);
  });
  it('el presupuesto no inventa tiempos ni omite la cola de lote', () => {
    const { input } = trainingFixture();
    input.config.batchSize = 9;
    const budget = trainingBudget(input);
    expect(budget.updates).toBe(28);
    expect(budget.upper).toBeGreaterThan(budget.lower);
    expect(budget.numericBytes).toBeGreaterThan(0);
    expect(budget.extensive).toBe(false);
    input.config.epochs = 10000;
    input.config.batchSize = 1;
    expect(trainingBudget(input).extensive).toBe(true);
  });
  it.each(['moons', 'flowers', 'sine'] as const)(
    'forward/backward fragmentados coinciden con el motor D3: %s',
    (recipe) => {
      const { input } = trainingFixture(recipe);
      const model = createNetwork(input.config.spec, 42);
      expect(exhaust(forwardChunks(model, input.train.x[0]!))).toEqual(
        forward(model, input.train.x[0]!),
      );
      for (const loss of ['mse', 'mae'] as const)
        expect(exhaust(backwardChunks(model, input.train.x[0]!, input.train.y[0]!, loss))).toEqual(
          backward(model, input.train.x[0]!, input.train.y[0]!, loss),
        );
      expect(() => exhaust(forwardChunks(model, []))).toThrow('SHAPE');
      const corrupt = createNetwork(input.config.spec, 42);
      corrupt.layers[0]!.weights.fill(Number.MAX_VALUE);
      expect(() =>
        exhaust(forwardChunks(corrupt, Array(input.config.spec.inputs).fill(Number.MAX_VALUE))),
      ).toThrow('NON_FINITE');
    },
  );
  it.each(['sgd', 'momentum', 'rmsprop', 'adam'] as OptimizerKind[])(
    'el optimizador %s mantiene sus momentos y no muta el estado',
    (kind) => {
      const model = createNetwork({ ...defaultSpec, inputs: 1, hidden: [] }, 42, 'zero');
      model.layers[0]!.weights[0] = 1;
      const state = createOptimizer(model),
        config = { ...defaultOptimizer, kind, rate: 0.1 };
      const next = exhaust(
        optimizerStep(model, state, [Float64Array.of(2), Float64Array.of(0)], config, 0.1),
      );
      expect(model.layers[0]!.weights[0]).toBe(1);
      expect(state.step).toBe(0);
      expect(next.optimizer.step).toBe(1);
      validateOptimizerState(next.model, next.optimizer);
      if (kind === 'adam')
        expect(next.model.layers[0]!.weights[0]).toBeCloseTo(oracle.adamFirstStep.expected, 12);
      if (kind === 'sgd' || kind === 'momentum')
        expect(next.model.layers[0]!.weights[0]).toBeCloseTo(0.8, 12);
      const again = exhaust(
        optimizerStep(
          next.model,
          next.optimizer,
          [Float64Array.of(2), Float64Array.of(0)],
          config,
          0.1,
        ),
      );
      expect(again.optimizer.step).toBe(2);
      if (kind === 'momentum') expect(again.model.layers[0]!.weights[0]).toBeCloseTo(0.42, 12);
      expect(() => exhaust(optimizerStep(model, state, [], config, 0.1))).toThrow('SHAPE');
      expect(() =>
        exhaust(
          optimizerStep(model, state, [Float64Array.of(2, 3), Float64Array.of(0)], config, 0.1),
        ),
      ).toThrow('SHAPE');
      expect(() =>
        exhaust(
          optimizerStep(model, state, [Float64Array.of(Infinity), Float64Array.of(0)], config, 0.1),
        ),
      ).toThrow('NON_FINITE');
    },
  );
  it('calendarios respetan el mínimo y las fronteras', () => {
    expect(learningRate(defaultOptimizer, 100, 100)).toBe(0.01);
    expect(learningRate({ ...defaultOptimizer, scheduler: 'step', period: 2 }, 2, 10)).toBe(0.005);
    expect(learningRate({ ...defaultOptimizer, scheduler: 'step' }, 10000, 10000)).toBe(
      defaultOptimizer.minimum,
    );
    expect(learningRate({ ...defaultOptimizer, scheduler: 'cosine' }, 0, 10)).toBeCloseTo(0.01);
    expect(learningRate({ ...defaultOptimizer, scheduler: 'cosine' }, 10, 10)).toBe(
      defaultOptimizer.minimum,
    );
  });
  it.each(['moons', 'flowers', 'sine'] as const)(
    'restaurar Adam reproduce toda actualización y el lote final: %s',
    (recipe) => {
      const { input } = trainingFixture(recipe);
      input.config.batchSize = 9;
      let state = exhaust(initialSession(input));
      validateCheckpoint(state, input);
      const initialLoss = state.history[0]!.trainLoss;
      state = exhaust(advanceBatch(state, input));
      const restored = cloneState(state);
      validateCheckpoint(restored, input);
      let resumed = restored;
      while (state.epoch < input.config.epochs) {
        const before = cloneState(state);
        state = exhaust(advanceBatch(state, input));
        resumed = exhaust(advanceBatch(resumed, input));
        expect(before.optimizer.step + 1).toBe(state.optimizer.step);
        validateCheckpoint(state, input);
        expect(resumed).toEqual(state);
      }
      expect(state.history).toHaveLength(5);
      expect(state.history.at(-1)!.trainLoss).toBeLessThan(initialLoss);
      expect(state.updates).toBe(4 * Math.ceil(input.train.ids.length / 9));
      expect(() => exhaust(advanceBatch(state, input))).toThrow('COMPLETED');
      state.frozen = true;
      expect(() => exhaust(advanceBatch(state, input))).toThrow('FROZEN');
    },
  );
  it('descartar un candidato incompleto conserva parámetros, momentos y cursor', () => {
    const { input } = trainingFixture();
    const state = exhaust(initialSession(input));
    const snapshot = cloneState(state);
    const work = advanceBatch(state, input);
    for (let i = 0; i < 10; i++) work.next();
    work.return(state);
    expect(state).toEqual(snapshot);
  });
  it('rechaza entradas, optimizadores y checkpoints inconsistentes', () => {
    const { input } = trainingFixture();
    validateTraining(input);
    validateOptimizer(defaultOptimizer);
    const mutations: ((i: TrainingInput) => void)[] = [
      (i) => (i.config.epochs = 0),
      (i) => (i.config.epochs = 10001),
      (i) => (i.config.epochs = 0.5),
      (i) => (i.config.batchSize = 0),
      (i) => (i.config.batchSize = 999),
      (i) => (i.dataHash = 'bad'),
      (i) => (i.train.ids[0] = i.validation.ids[0]!),
      (i) => (i.classOrder = ['x']),
      (i) => i.train.y.fill(0),
      (i) => i.validation.y.fill(0),
      (i) => (i.config.seed = -1),
      (i) => (i.config.spec.hidden = [0]),
    ];
    for (const mutate of mutations) {
      const next = structuredClone(input);
      mutate(next);
      expect(() => validateTraining(next)).toThrow();
    }
    for (const change of [
      { rate: NaN },
      { rate: 0 },
      { rate: 2 },
      { momentum: 1 },
      { rho: -1 },
      { beta1: 1 },
      { beta2: NaN },
      { epsilon: 0 },
      { epsilon: 1 },
      { period: 0 },
      { minimum: 0 },
      { minimum: 1 },
    ])
      expect(() => validateOptimizer({ ...defaultOptimizer, ...change })).toThrow('INVALID_CONFIG');
    for (const samples of [
      { ...input.train, ids: [] },
      { ...input.train, ids: input.train.ids.map(() => 'same') },
      { ...input.train, x: [[NaN]] },
      { ...input.train, y: input.train.y.map(() => 2) },
    ])
      expect(() => validateSamples(samples, input.config)).toThrow('INVALID_DATA');
    const state = exhaust(initialSession(input));
    const badStates = [
      { ...state, configHash: 'bad' },
      { ...state, epoch: -1 },
      { ...state, cursor: 1 },
      { ...state, updates: 1 },
      { ...state, batchIndex: 1 },
      { ...state, order: [] },
      { ...state, lastBatchIds: ['wrong'] },
      { ...state, history: [] },
      { ...state, baseline: Infinity },
      { ...state, gradientNorms: [-1] },
      { ...state, frozen: undefined },
      { ...state, history: [{ ...state.history[0]!, trainLoss: -1 }] },
    ];
    for (const next of badStates)
      expect(() => validateCheckpoint(next as typeof state, input)).toThrow();
    const opt = createOptimizer(state.model);
    opt.second[0]![0] = -1;
    expect(() => validateOptimizerState(state.model, opt)).toThrow('CHECKPOINT');
    opt.second[0]![0] = NaN;
    expect(() => validateOptimizerState(state.model, opt)).toThrow('NON_FINITE');
    opt.step = -1;
    expect(() => validateOptimizerState(state.model, opt)).toThrow('CHECKPOINT');
    expect(parameterVectors(state.model)).toHaveLength(state.model.layers.length * 2);
  });
  it('las alertas son hipótesis con ventanas y soporte explícitos', () => {
    const { input } = trainingFixture();
    const point = exhaust(initialSession(input)).history[0]!;
    const gap = Array.from({ length: 6 }, (_, epoch) => ({
      ...point,
      epoch,
      trainLoss: 0.5,
      validationLoss: 1,
      gradientNorm: 0,
    }));
    expect(diagnostics(gap, 19)).toEqual([]);
    expect(diagnostics(gap.slice(0, 3), 60)).toEqual([]);
    expect(diagnostics(gap, 60)).toEqual(['gap', 'vanishing', 'plateau']);
    expect(
      diagnostics(
        gap.map((p) => ({ ...p, gradientNorm: 101 })),
        60,
      ),
    ).toEqual(['gap', 'exploding', 'plateau']);
    expect(
      diagnostics(
        gap.map((p, i) => ({ ...p, trainLoss: 1 / (i + 1), validationLoss: 0.1, gradientNorm: 1 })),
        60,
      ),
    ).toEqual([]);
  });
});
describe('métricas con soporte y casos no definidos', () => {
  it('matriz real por filas, predicción por columnas; umbral y clase positiva', () => {
    const r = classificationMetrics([0, 0, 1, 1], [[0.1], [0.8], [0.9], [0.2]], 2);
    expect(r.matrix).toEqual([
      [1, 1],
      [1, 1],
    ]);
    expect(r.accuracy).toBe(0.5);
    expect(r.perClass[1]).toEqual({
      support: 2,
      tp: 1,
      fp: 1,
      tn: 1,
      fn: 1,
      precision: 0.5,
      recall: 0.5,
      f1: 0.5,
    });
    expect(r.macroF1).toBe(0.5);
    expect(r.weightedF1).toBe(0.5);
    expect(classificationMetrics([0], [[0.5]], 2, 0.5, 0).predicted).toEqual([0]);
    expect(classificationMetrics([0], [[0.6]], 2, 0.5, 0).predicted).toEqual([1]);
    expect(classificationMetrics([0], [[0.1]], 2).undefinedMetrics).toBe(true);
  });
  it('softmax binaria y multiclase no se confunden con una sigmoide', () => {
    expect(
      classificationMetrics(
        [0, 1],
        [
          [0.9, 0.1],
          [0.1, 0.9],
        ],
        2,
      ).accuracy,
    ).toBe(1);
    expect(
      classificationMetrics(
        [2, 1],
        [
          [0.1, 0.1, 0.8],
          [0.1, 0.7, 0.2],
        ],
        3,
      ).matrix,
    ).toEqual([
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    for (const [actual, p, classes] of [
      [[], [], 2],
      [[0], [[2]], 2],
      [[0], [[0.2, 0.2]], 2],
      [[2], [[0.1]], 2],
      [[0], [[0.1]], 1],
    ] as const)
      expect(() =>
        classificationMetrics(
          [...actual],
          p.map((v) => [...v]),
          classes,
        ),
      ).toThrow();
    expect(() => classificationMetrics([0], [[0.1]], 2, -1)).toThrow();
    expect(() => classificationMetrics([0], [[0.1]], 2, 0.5, 3)).toThrow();
  });
  it('regresión conserva residuos, unidades y baseline ajustado en train', () => {
    expect(regressionMetrics([1, 1], [1, 1], 1).r2).toBeNull();
    expect(regressionMetrics([1e-160, 2e-160], [1, 1], 0).r2).toBeNull();
    expect(regressionMetrics([1, 3], [2, 1], 2)).toEqual({
      mse: 2.5,
      mae: 1.5,
      rmse: Math.sqrt(2.5),
      baselineMse: 1,
      baselineMae: 1,
      r2: -1.5,
      residuals: [-1, 2],
    });
    for (const args of [
      [[], [], 0],
      [[1], [], 0],
      [[1], [1], Infinity],
      [[Infinity], [1], 0],
      [[1e308], [-1e308], 0],
    ] as [number[], number[], number][])
      expect(() => regressionMetrics(...args)).toThrow();
  });
});
