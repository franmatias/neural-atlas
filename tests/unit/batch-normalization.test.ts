import { describe, expect, it } from 'vitest';
import { trainingFixture } from '../fixtures/training';
import {
  createNetwork,
  cloneNetwork,
  defaultSpec,
  forward,
  validateNetwork,
  parameterCount,
} from '@/domain/network/model';
import { backward } from '@/domain/network/backprop';
import { createRandom } from '@/domain/random/seeded';
import { exhaust, forwardChunks, backwardChunks } from '@/domain/training/kernel';
import { normalizedBatch, commitStatistics } from '@/domain/training/normalized-batch';
import { parameterVectors } from '@/domain/training/optimizer';
import { batchCount, batchEnd } from '@/domain/training/batches';
import {
  initialSession,
  advanceBatch,
  cloneState,
  validateCheckpoint,
  validateTraining,
} from '@/domain/training/session';
import { continueBest } from '@/domain/training/early-stopping';
import {
  captureExperiment,
  exportExperiment,
  importExperiment,
  prepareExperiment,
  experimentWire,
} from '@/application/training/experiment';
import {
  modelFromExperiment,
  exportInferenceModel,
  importInferenceModel,
  predictWithModel,
  validateInferenceModel,
} from '@/application/training/inference-model';
import {
  compareGeneralization,
  defaultGeneralization,
} from '@/application/training/generalization';
import { trainingBudget } from '@/domain/training/budget';
function fixture(recipe: 'moons' | 'flowers' | 'sine' = 'moons') {
  const f = trainingFixture(recipe);
  f.input.config.spec.batchNormalization = true;
  f.input.config.spec.hidden = [3, 2];
  f.input.config.batchSize = 11;
  f.input.config.epochs = 2;
  f.input.config.dropout = { rate: 0.25 };
  f.input.config.regularization = { l1: 0.001, l2: 0.002, clipNorm: 0.1 };
  return f;
}
function archive(f: ReturnType<typeof fixture>, state: ReturnType<typeof cloneState>) {
  return captureExperiment(
    f.dataset,
    f.split,
    f.prepared.pipeline.options,
    f.input.pipelineHash,
    f.input.config,
    state,
    0.5,
    1,
    false,
  );
}
const randomContext = () => ({
  rate: 0.25,
  random: createRandom(42, 'dropout'),
  masks: [] as number[][],
});
describe('BN por lote, gamma/beta y estadísticas de inferencia', () => {
  for (const task of ['binary', 'multiclass', 'regression'] as const)
    for (const activation of ['tanh', 'sigmoid', 'relu', 'leakyRelu'] as const)
      it(`${task}/${activation}: todos los gradientes, incluidas gamma y beta, con máscara fija`, () => {
        const model = createNetwork(
          {
            ...defaultSpec,
            task,
            classes: 3,
            hidden: [3, 2],
            activation,
            batchNormalization: true,
          },
          43,
          'xavier',
        );
        model.layers.forEach((l) => {
          if (l.normalization) l.normalization.beta.fill(0.17);
        });
        const x = [
            [0.3, -0.7],
            [1.1, 0.2],
            [-0.5, 0.8],
            [0.15, 0.42],
          ],
          y =
            task === 'multiclass'
              ? [0, 1, 2, 1]
              : task === 'binary'
                ? [0, 1, 1, 0]
                : [0.1, -0.5, 1.2, 0.3];
        const analytical = exhaust(normalizedBatch(model, x, y, 'mse', randomContext()));
        const before = cloneNetwork(model);
        for (let i = 0; i < analytical.gradient.length; i++)
          for (let j = 0; j < analytical.gradient[i]!.length; j++) {
            const plus = cloneNetwork(model),
              minus = cloneNetwork(model),
              epsilon = 1e-5;
            parameterVectors(plus)[i]![j]! += epsilon;
            parameterVectors(minus)[i]![j]! -= epsilon;
            const numerical =
              (exhaust(normalizedBatch(plus, x, y, 'mse', randomContext())).loss -
                exhaust(normalizedBatch(minus, x, y, 'mse', randomContext())).loss) /
              (2 * epsilon);
            expect(
              Math.abs(analytical.gradient[i]![j]! - numerical) /
                Math.max(1, Math.abs(numerical), Math.abs(analytical.gradient[i]![j]!)),
            ).toBeLessThan(2e-5);
          }
        expect(model).toEqual(before);
      });
  for (const recipe of ['moons', 'flowers', 'sine'] as const)
    for (const kind of ['sgd', 'momentum', 'rmsprop', 'adam'] as const)
      it(`${recipe}/${kind}: cola combinada, archivo v5 y siguiente lote exacto`, () => {
        const f = fixture(recipe);
        f.input.config.optimizer.kind = kind;
        let state = exhaust(initialSession(f.input));
        validateCheckpoint(state, f.input);
        expect(state.model.layers[0]!.normalization!.initialized).toBe(false);
        const initial = importExperiment(exportExperiment(archive(f, state)));
        expect(initial.schemaVersion).toBe(5);
        const visited: string[] = [];
        const batches = batchCount(f.input.train.ids.length, 11, true);
        for (let i = 0; i < batches; i++) {
          state = exhaust(advanceBatch(state, f.input));
          visited.push(...state.lastBatchIds);
          validateCheckpoint(state, f.input);
        }
        expect(new Set(visited).size).toBe(f.input.train.ids.length);
        expect(state.epoch).toBe(1);
        expect(state.updates).toBe(batches);
        expect(state.lastBatchIds.length).toBeGreaterThanOrEqual(2);
        const file = archive(f, state),
          restored = importExperiment(exportExperiment(file));
        const next = exhaust(advanceBatch(state, f.input)),
          resumed = exhaust(
            advanceBatch(restored.checkpoint, prepareExperiment(restored).source.input),
          );
        expect(resumed).toEqual(next);
        validateCheckpoint(next, f.input);
        expect(next.gradientControl!.appliedAffine).toBeLessThanOrEqual(
          next.gradientControl!.appliedNorm + 1e-12,
        );
        expect(next.gradientControl!.appliedNorm).toBeLessThanOrEqual(0.1 + 1e-12);
        const model = modelFromExperiment(file),
          copy = importInferenceModel(exportInferenceModel(model));
        expect(copy.schemaVersion).toBe(2);
        expect(predictWithModel(copy, f.dataset.rows[0]!.features)).toEqual(
          predictWithModel(model, f.dataset.rows[0]!.features),
        );
        const before = experimentWire(file).checkpoint;
        expect(forward(state.model, f.input.train.x[0]!).activations).toEqual(
          exhaust(forwardChunks(state.model, f.input.train.x[0]!)).activations,
        );
        expect(experimentWire(file).checkpoint).toEqual(before);
        const clone = cloneState(state);
        clone.model.layers[0]!.normalization!.gamma[0] = 99;
        clone.model.layers[0]!.normalization!.mean[0] = 99;
        clone.batchStatistics!.means[0]![0] = 99;
        expect(state.model.layers[0]!.normalization!.gamma[0]).not.toBe(99);
        expect(state.batchStatistics!.means[0]![0]).not.toBe(99);
      });
  it('primera estadística reemplaza el inicial; EMA usa varianza poblacional y eval no actualiza', () => {
    const model = createNetwork(
      { ...defaultSpec, hidden: [1], batchNormalization: true },
      42,
      'zero',
    );
    model.layers[0]!.weights[0] = 1;
    const batch = exhaust(
      normalizedBatch(
        model,
        [
          [1, 0],
          [3, 0],
        ],
        [0, 1],
        'mse',
      ),
    );
    expect(batch.statistics.means).toEqual([[2]]);
    expect(batch.statistics.variances).toEqual([[1]]);
    commitStatistics(model, batch.statistics);
    expect(model.layers[0]!.normalization!.mean).toEqual([2]);
    commitStatistics(model, { size: 2, means: [[4]], variances: [[9]] });
    expect(model.layers[0]!.normalization!.mean[0]).toBeCloseTo(2.2);
    expect(model.layers[0]!.normalization!.variance[0]).toBeCloseTo(1.8);
    const before = cloneNetwork(model);
    forward(model, [5, 0]);
    expect(model).toEqual(before);
    expect(parameterCount(model.spec)).toBe(7);
    expect(() => backward(model, [1, 0], 1)).toThrow('BATCH_REQUIRED');
    expect(() => exhaust(backwardChunks(model, [1, 0], 1, 'mse'))).toThrow('BATCH_REQUIRED');
    expect(() => exhaust(forwardChunks(model, [1, 0], randomContext()))).toThrow('BATCH_REQUIRED');
  });
  it('rechaza lotes unitarios y combina una cola de uno sin perder muestras', () => {
    expect(batchCount(56, 11, true)).toBe(5);
    expect(batchCount(56, 11)).toBe(6);
    expect(batchEnd(44, 56, 11, true)).toBe(56);
    expect(batchEnd(0, 3, 2, true)).toBe(3);
    const f = fixture();
    f.input.config.batchSize = 1;
    expect(() => validateTraining(f.input)).toThrow('INVALID_CONFIG');
    f.input.config.batchSize = 11;
    const model = exhaust(initialSession(f.input)).model;
    expect(() => exhaust(normalizedBatch(model, [[1, 2]], [1], 'mse'))).toThrow('BATCH_REQUIRED');
    const initial = exhaust(initialSession(f.input)),
      before = cloneState(initial),
      job = advanceBatch(initial, f.input);
    for (let i = 0; i < 50; i++) job.next();
    job.return(initial);
    expect(initial).toEqual(before);
    expect(trainingBudget(f.input).updates).toBe(10);
  });
  it('restaura BN, momentos y RNG del mejor estado y mantiene test congelado', () => {
    const f = fixture();
    f.input.config.epochs = 20;
    f.input.config.initialization = 'zero';
    f.input.config.optimizer.rate = 1e-5;
    f.input.config.optimizer.minimum = 1e-5;
    f.input.config.earlyStopping = { patience: 5, minDelta: 0.01 };
    let state = exhaust(initialSession(f.input));
    while (!state.earlyStopping?.reason) state = exhaust(advanceBatch(state, f.input));
    validateCheckpoint(state, f.input);
    expect(state.epoch).toBe(1);
    expect(state.earlyStopping!.stoppedAt).toBe(6);
    const restored = importExperiment(exportExperiment(archive(f, state))).checkpoint;
    expect(exhaust(advanceBatch(continueBest(restored, 20), f.input))).toEqual(
      exhaust(advanceBatch(continueBest(state, 20), f.input)),
    );
    const frozen = { ...state, frozen: true };
    validateCheckpoint(frozen, f.input);
    expect(() => exhaust(advanceBatch(frozen, f.input))).toThrow('FROZEN');
  });
  it('rechaza estado BN, traza y versiones incompatibles sin aceptar corrupción', () => {
    const f = fixture(),
      state = exhaust(advanceBatch(exhaust(initialSession(f.input)), f.input));
    const mutations = [
      (s: typeof state) => {
        s.model.layers[0]!.normalization!.variance[0] = -1;
      },
      (s: typeof state) => {
        s.model.layers[0]!.normalization!.gamma[0] = NaN;
      },
      (s: typeof state) => {
        s.model.layers[0]!.normalization!.initialized = false;
      },
      (s: typeof state) => {
        delete s.batchStatistics;
      },
      (s: typeof state) => {
        s.batchStatistics!.size = 1;
      },
      (s: typeof state) => {
        s.batchStatistics!.means = [];
      },
      (s: typeof state) => {
        s.batchStatistics!.variances[0]![0] = -1;
      },
      (s: typeof state) => {
        delete s.model.layers[0]!.normalization;
      },
      (s: typeof state) => {
        s.optimizer.first.pop();
      },
      (s: typeof state) => {
        s.gradientControl!.rawAffine = 99;
      },
    ];
    for (const mutate of mutations) {
      const bad = cloneState(state);
      mutate(bad);
      expect(() => validateCheckpoint(bad, f.input)).toThrow();
    }
    const file = archive(f, state);
    file.schemaVersion = 4;
    expect(() => prepareExperiment(file)).toThrow('EXPERIMENT_VERSION');
    const model = modelFromExperiment(archive(f, state));
    model.schemaVersion = 1;
    expect(() => validateInferenceModel(model)).toThrow('MODEL_VERSION');
    const noBN = cloneNetwork(state.model);
    delete noBN.spec.batchNormalization;
    expect(() => validateNetwork(noBN)).toThrow('NORMALIZATION');
  });
  it('compara BN con los mismos pesos densos y reserva test', () => {
    const result = compareGeneralization({
      ...defaultGeneralization,
      intervention: 'bn',
      epochs: 5,
    });
    expect(result.runs[0]!.initialHash).toBe(result.runs[1]!.initialHash);
    expect(result.runs[1]!.experiment.schemaVersion).toBe(5);
    expect(result.runs.every((r) => !r.experiment.testConsulted)).toBe(true);
  });
});
