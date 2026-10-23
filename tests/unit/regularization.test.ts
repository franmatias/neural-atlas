import { describe, expect, it } from 'vitest';
import {
  controlGradient,
  defaultRegularization,
  penalty,
  validateRegularization,
  validateGradientControl,
} from '@/domain/training/regularization';
import { propagationPreset } from '@/domain/network/presets';
import { backward } from '@/domain/network/backprop';
import { cloneNetwork, stableNorm } from '@/domain/network/model';
import { parameterVectors, type OptimizerKind } from '@/domain/training/optimizer';
import { exhaust } from '@/domain/training/kernel';
import {
  initialSession,
  advanceBatch,
  cloneState,
  validateCheckpoint,
} from '@/domain/training/session';
import {
  captureExperiment,
  exportExperiment,
  importExperiment,
  prepareExperiment,
} from '@/application/training/experiment';
import {
  compareGeneralization,
  defaultGeneralization,
} from '@/application/training/generalization';
import {
  modelFromExperiment as fromExperiment,
  predictWithModel,
  exportInferenceModel,
  importInferenceModel,
} from '@/application/training/inference-model';
import { trainingFixture } from '../fixtures/training';
describe('regularización y recorte reales', () => {
  it('nueve derivadas centrales del objetivo incluyendo sesgos sin penalizar', () => {
    const model = propagationPreset(),
      config = { l1: 0.03, l2: 0.02, clipNorm: 0 };
    const data = backward(model, [0.8, 0.2], 1),
      gradients = data.gradient.flatMap((g) => [g.weights, g.biases]);
    const actual = exhaust(controlGradient(model, gradients, config, 0));
    for (let vector = 0; vector < gradients.length; vector++)
      for (let j = 0; j < gradients[vector]!.length; j++) {
        const plus = cloneNetwork(model),
          minus = cloneNetwork(model),
          epsilon = 1e-5;
        parameterVectors(plus)[vector]![j]! += epsilon;
        parameterVectors(minus)[vector]![j]! -= epsilon;
        const numeric =
          (backward(plus, [0.8, 0.2], 1).loss +
            penalty(plus, config) -
            backward(minus, [0.8, 0.2], 1).loss -
            penalty(minus, config)) /
          (2 * epsilon);
        expect(actual.gradient[vector]![j]).toBeCloseTo(numeric, 7);
      }
    expect(gradients[0]).toEqual(data.gradient[0]!.weights);
    model.layers[0]!.weights[0] = 0;
    const zero = exhaust(controlGradient(model, gradients, { l1: 0.1, l2: 0, clipNorm: 0 }, 0));
    expect(zero.gradient[0]![0]).toBe(gradients[0]![0]);
  });
  it('recorta globalmente pesos y sesgos con un factor común y no muta buffers', () => {
    const model = propagationPreset(),
      gradient = parameterVectors(model).map((v) => new Float64Array(v.length).fill(3));
    const controlled = exhaust(
      controlGradient(model, gradient, { ...defaultRegularization, clipNorm: 0.1 }, 4),
    );
    expect(controlled.telemetry.rawNorm).toBeCloseTo(9, 12);
    expect(controlled.telemetry.appliedNorm).toBeLessThanOrEqual(0.1);
    expect(controlled.telemetry.clippedUpdates).toBe(5);
    for (const vector of controlled.gradient)
      for (const value of vector) expect(value).toBeCloseTo(3 * controlled.telemetry.scale, 12);
    expect(gradient[0]![0]).toBe(3);
    validateGradientControl(controlled.telemetry, 2, 5);
    expect(() =>
      validateGradientControl(controlled.telemetry, 2, 5, defaultRegularization),
    ).toThrow('CHECKPOINT');
    expect(() =>
      validateGradientControl({ ...controlled.telemetry, clippedUpdates: 0 }, 2, 5),
    ).toThrow('CHECKPOINT');
    expect(() =>
      validateGradientControl(
        {
          ...controlled.telemetry,
          appliedWeights: [1, ...controlled.telemetry.appliedWeights.slice(1)],
        },
        2,
        5,
      ),
    ).toThrow('CHECKPOINT');
    expect(() =>
      validateGradientControl(
        {
          ...controlled.telemetry,
          appliedBiases: [1, ...controlled.telemetry.appliedBiases.slice(1)],
        },
        2,
        5,
      ),
    ).toThrow('CHECKPOINT');
    expect(() => validateGradientControl({ ...controlled.telemetry, scale: 2 }, 2, 5)).toThrow(
      'CHECKPOINT',
    );
    expect(() =>
      validateGradientControl({ ...controlled.telemetry, rawWeights: [1] }, 2, 5),
    ).toThrow('CHECKPOINT');
    expect(() =>
      validateGradientControl({ ...controlled.telemetry, appliedNorm: 0.2 }, 2, 5),
    ).toThrow('CHECKPOINT');
    expect(() =>
      validateGradientControl({ ...controlled.telemetry, clippedUpdates: 6 }, 2, 5),
    ).toThrow('CHECKPOINT');
  });
  it('desactivado coincide exactamente con el motor anterior y valida finitud/formas', () => {
    const f = trainingFixture(),
      initial = exhaust(initialSession(f.input));
    const legacy = exhaust(advanceBatch(initial, f.input));
    const regularized = {
      ...f.input,
      config: { ...f.input.config, regularization: { ...defaultRegularization } },
    };
    const zero = exhaust(advanceBatch(exhaust(initialSession(regularized)), regularized));
    expect(zero.model).toEqual(legacy.model);
    expect(zero.optimizer).toEqual(legacy.optimizer);
    expect(zero.gradientControl?.scale).toBe(1);
    const oldFile = captureExperiment(
      f.dataset,
      f.split,
      f.prepared.pipeline.options,
      f.input.pipelineHash,
      f.input.config,
      legacy,
      0.5,
      1,
      false,
    );
    expect(oldFile.schemaVersion).toBe(1);
    expect(importExperiment(exportExperiment(oldFile)).checkpoint).toEqual(legacy);
    const newFile = captureExperiment(
      f.dataset,
      f.split,
      f.prepared.pipeline.options,
      f.input.pipelineHash,
      regularized.config,
      zero,
      0.5,
      1,
      false,
    );
    expect(newFile.schemaVersion).toBe(2);
    expect(() => prepareExperiment({ ...newFile, engineVersion: 1 })).toThrow('EXPERIMENT_VERSION');
    const wrongPenalty = exhaust(initialSession(regularized));
    wrongPenalty.history[0]!.regularizationPenalty! += 1;
    wrongPenalty.history[0]!.trainObjective! += 1;
    expect(() => validateCheckpoint(wrongPenalty, regularized)).toThrow('CHECKPOINT');
    const absent = cloneState(zero);
    delete absent.gradientControl;
    expect(() => validateCheckpoint(absent, regularized)).toThrow('CHECKPOINT');
    const inconsistent = cloneState(zero);
    inconsistent.history[0]!.trainObjective! += 1;
    expect(() => validateCheckpoint(inconsistent, regularized)).toThrow('CHECKPOINT');
    expect(() =>
      validateCheckpoint({ ...legacy, gradientControl: zero.gradientControl }, f.input),
    ).toThrow('CHECKPOINT');
    for (const invalid of [
      { l1: -1, l2: 0, clipNorm: 0 },
      { l1: 0, l2: NaN, clipNorm: 0 },
      { l1: 0, l2: 0, clipNorm: 0.05 },
      { l1: 0.2, l2: 0, clipNorm: 0 },
    ])
      expect(() => validateRegularization(invalid)).toThrow('INVALID_CONFIG');
    const model = propagationPreset(),
      vectors = parameterVectors(model).map((v) => new Float64Array(v.length));
    expect(() => exhaust(controlGradient(model, [], defaultRegularization, 0))).toThrow('SHAPE');
    expect(() =>
      exhaust(
        controlGradient(
          model,
          [new Float64Array(0), ...vectors.slice(1)],
          defaultRegularization,
          0,
        ),
      ),
    ).toThrow('SHAPE');
    vectors[0]![0] = Infinity;
    expect(() => exhaust(controlGradient(model, vectors, defaultRegularization, 0))).toThrow(
      'NON_FINITE',
    );
    vectors.forEach((v) => v.fill(1e308));
    expect(() => exhaust(controlGradient(model, vectors, defaultRegularization, 0))).toThrow(
      'NON_FINITE',
    );
    model.layers[0]!.weights[0] = Infinity;
    expect(() => penalty(model, { l1: 0.1, l2: 0.1, clipNorm: 0 })).toThrow('NON_FINITE');
  });
  it('la penalización se suma una vez al gradiente medio, independiente del tamaño del lote', () => {
    const f = trainingFixture('sine'),
      input = f.input;
    input.train.x = input.train.x.map(() => [...input.train.x[0]!]);
    input.train.y = input.train.y.map(() => input.train.y[0]!);
    input.config.optimizer.kind = 'sgd';
    input.config.regularization = { l1: 0.01, l2: 0.02, clipNorm: 0 };
    input.config.batchSize = 1;
    const one = exhaust(advanceBatch(exhaust(initialSession(input)), input));
    const full = { ...input, config: { ...input.config, batchSize: input.train.ids.length } };
    const many = exhaust(advanceBatch(exhaust(initialSession(full)), full));
    parameterVectors(one.model).forEach((v, i) =>
      v.forEach((w, j) => expect(w).toBeCloseTo(parameterVectors(many.model)[i]![j]!, 12)),
    );
  });
  for (const recipe of ['moons', 'flowers', 'sine'] as const)
    for (const optimizer of ['sgd', 'momentum', 'rmsprop', 'adam'] as OptimizerKind[]) {
      it(`${recipe}/${optimizer}: checkpoint JSON continúa exactamente, inferencia conserva salidas`, () => {
        const f = trainingFixture(recipe);
        f.input.config.optimizer.kind = optimizer;
        f.input.config.regularization = { l1: 0.002, l2: 0.01, clipNorm: 0.1 };
        const first = exhaust(advanceBatch(exhaust(initialSession(f.input)), f.input));
        const snapshot = captureExperiment(
          f.dataset,
          f.split,
          f.prepared.pipeline.options,
          f.input.pipelineHash,
          f.input.config,
          first,
          0.5,
          1,
          false,
        );
        const restored = importExperiment(exportExperiment(snapshot)),
          prepared = prepareExperiment(restored);
        const continuous = exhaust(advanceBatch(first, f.input)),
          resumed = exhaust(advanceBatch(restored.checkpoint, prepared.source.input));
        expect(resumed).toEqual(continuous);
        validateCheckpoint(resumed, prepared.source.input);
        const copy = cloneState(resumed);
        copy.gradientControl!.rawWeights[0] = 999;
        expect(resumed.gradientControl!.rawWeights[0]).not.toBe(999);
        const model = fromExperiment(snapshot),
          imported = importInferenceModel(exportInferenceModel(model));
        const values = f.dataset.rows[0]!.features;
        expect(predictWithModel(imported, values)).toEqual(predictWithModel(model, values));
        const bad = cloneState(first);
        bad.gradientControl!.clippedUpdates = 999;
        expect(() => validateCheckpoint(bad, f.input)).toThrow('CHECKPOINT');
      });
    }
  it('ensayos emparejados aíslan una intervención y separan pérdida/objetivo', () => {
    const result = compareGeneralization({ ...defaultGeneralization, epochs: 5 });
    expect(result.counts).toEqual({ train: 72, validation: 24, test: 24 });
    expect(result.runs[0]!.initialHash).toBe(result.runs[1]!.initialHash);
    expect(result.runs[0]!.experiment.pipelineHash).toBe(result.runs[1]!.experiment.pipelineHash);
    for (const run of result.runs) {
      const state = run.experiment.checkpoint,
        p = state.history.at(-1)!;
      expect(p.trainObjective).toBeCloseTo(p.trainLoss + p.regularizationPenalty!, 12);
      expect(run.weightNorm).toBeCloseTo(
        stableNorm(state.model.layers.flatMap((layer) => Array.from(layer.weights))),
        12,
      );
      expect(run.experiment.testConsulted).toBe(false);
    }
    const same = compareGeneralization({ ...defaultGeneralization, lambda: 0, epochs: 5 });
    expect(same.runs[0]!.experiment.checkpoint).toEqual(same.runs[1]!.experiment.checkpoint);
    for (const intervention of ['l1', 'clip'] as const)
      expect(
        compareGeneralization({ ...defaultGeneralization, intervention, epochs: 5 }).runs,
      ).toHaveLength(2);
    expect(() => compareGeneralization({ ...defaultGeneralization, epochs: 121 })).toThrow();
  });
});
