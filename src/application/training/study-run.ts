import type { Dataset, DataSplit } from '@/domain/data/types';
import { fitPipeline, transformRow, type PipelineOptions } from '@/domain/data/pipeline';
import { stableNorm } from '@/domain/network/model';
import { initialSession, advanceBatch, type TrainingConfig } from '@/domain/training/session';
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
  while (state.epoch < config.epochs && !state.earlyStopping?.reason)
    state = exhaust(advanceBatch(state, source.input));
  const weights = state.model.layers.flatMap((l) => Array.from(l.weights));
  return {
    label,
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
