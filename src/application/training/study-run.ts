import type { Dataset, DataSplit } from '@/domain/data/types';
import { fitPipeline, transformRow, type PipelineOptions } from '@/domain/data/pipeline';
import { stableNorm } from '@/domain/network/model';
import {
  initialSession,
  advanceBatch,
  evaluateChunks,
  type TrainingConfig,
} from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { hashValue } from '@/domain/data/integrity';
import { trainingSource } from './source';
import { captureExperiment } from './experiment';
import type { GeneralizationRun } from './generalization';

/** Complete, isolated training with the existing validated pipeline/checkpoint contracts. */
export function trainStudyRun(
  dataset: Dataset,
  split: DataSplit,
  config: TrainingConfig,
  label: string,
  pipelineOptions?: PipelineOptions,
  testConsulted = false,
  runtimeBudget?: { kind: 'updates' | 'time'; limit: number },
): GeneralizationRun {
  const pipeline = fitPipeline(
    dataset,
    split,
    pipelineOptions ?? {
      featureIds: dataset.features.map((f) => f.id),
      imputation: 'mean',
      scaling: 'standard',
      missingIndicators: false,
    },
  );
  const source = trainingSource(
    dataset,
    split,
    {
      pipeline,
      matrix: dataset.rows.map((row) => transformRow(row, pipeline)),
    },
    config,
  );
  let state = exhaust(initialSession(source.input));
  const initialHash = hashValue(
    state.model.layers.map((l) => ({
      weights: Array.from(l.weights),
      biases: Array.from(l.biases),
    })),
  );
  if (
    runtimeBudget &&
    (config.earlyStopping ||
      !Number.isInteger(runtimeBudget.limit) ||
      runtimeBudget.limit < (runtimeBudget.kind === 'time' ? 50 : 1) ||
      runtimeBudget.limit > (runtimeBudget.kind === 'time' ? 3000 : 10000))
  )
    throw new RangeError('STUDY_BUDGET');
  const started = performance.now();
  while (state.epoch < config.epochs && !state.earlyStopping?.reason) {
    if (
      runtimeBudget &&
      (runtimeBudget.kind === 'updates'
        ? state.updates >= runtimeBudget.limit
        : state.updates > 0 && performance.now() - started >= runtimeBudget.limit)
    )
      break;
    state = exhaust(advanceBatch(state, source.input));
  }
  const elapsedMs = performance.now() - started;
  let stop: GeneralizationRun['stop'];
  if (runtimeBudget) {
    const train = exhaust(
      evaluateChunks(state.model, source.input.trainEvaluation ?? source.input.train, config.loss),
    );
    const validation = exhaust(evaluateChunks(state.model, source.input.validation, config.loss));
    stop = {
      ...runtimeBudget,
      elapsedMs,
      reason: state.epoch >= config.epochs ? 'horizon' : runtimeBudget.kind,
      point: {
        epoch: state.epoch,
        update: state.updates,
        trainLoss: train.loss,
        validationLoss: validation.loss,
        trainScore: train.score,
        validationScore: validation.score,
        gradientNorm: stableNorm(state.gradientNorms),
      },
    };
  }
  const weights = state.model.layers.flatMap((l) => Array.from(l.weights));
  return {
    label,
    ...(stop ? { stop } : {}),
    initialHash,
    experiment: captureExperiment(
      dataset,
      split,
      pipeline.options,
      source.input.pipelineHash,
      source.input.config,
      state,
      0.5,
      1,
      testConsulted,
    ),
    weightNorm: stableNorm(weights),
    smallWeights: weights.filter((w) => Math.abs(w) < 0.01).length,
    weights: weights.length,
    trainingRows: source.input.train.ids.length,
    ...(source.augmentation ? { augmentation: source.augmentation } : {}),
  };
}
