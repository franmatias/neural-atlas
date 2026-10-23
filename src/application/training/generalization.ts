import { z } from '@/shared/validation';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { defaultSpec, stableNorm } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { initialSession, advanceBatch, type TrainingConfig } from '@/domain/training/session';
import { defaultRegularization } from '@/domain/training/regularization';
import { exhaust } from '@/domain/training/kernel';
import { hashValue } from '@/domain/data/integrity';
import { networkWire } from './network-schema';
import { trainingSource } from './source';
import { captureExperiment, type Experiment } from './experiment';
export const generalizationOptions = z.strictObject({
  seed: z.number().int().min(0).max(4294967295),
  noise: z.number().finite().min(0).max(0.4),
  epochs: z.number().int().min(5).max(120),
  intervention: z.enum(['l1', 'l2', 'clip']),
  lambda: z.number().finite().min(0).max(0.1),
  clipNorm: z.number().finite().min(0.1).max(100),
});
export type GeneralizationOptions = z.infer<typeof generalizationOptions>;
export const defaultGeneralization: GeneralizationOptions = {
  seed: 42,
  noise: 0.2,
  epochs: 40,
  intervention: 'l2',
  lambda: 0.01,
  clipNorm: 0.1,
};
export interface GeneralizationRun {
  label: string;
  initialHash: string;
  experiment: Experiment;
  weightNorm: number;
  smallWeights: number;
  weights: number;
}
export interface GeneralizationResult {
  options: GeneralizationOptions;
  runs: GeneralizationRun[];
  counts: { train: number; validation: number; test: number };
}
/** Matched synthetic runs: one intervention, no test scoring and no live laboratory mutation. */
export function compareGeneralization(raw: GeneralizationOptions): GeneralizationResult {
  const options = generalizationOptions.parse(raw);
  const dataset = generateDataset({
    ...defaultGenerator,
    recipe: 'moons',
    count: 120,
    noise: options.noise,
    seed: options.seed,
  });
  const split = splitDataset(dataset, {
    strategy: 'stratified',
    ratios: [0.6, 0.2, 0.2],
    seed: options.seed,
  });
  const pipeline = fitPipeline(dataset, split, {
    featureIds: dataset.features.map((f) => f.id),
    imputation: 'mean',
    scaling: 'standard',
    missingIndicators: false,
  });
  const prepared = { pipeline, matrix: dataset.rows.map((row) => transformRow(row, pipeline)) };
  const runs: GeneralizationRun[] = [];
  for (const intervention of [false, true]) {
    const regularization = { ...defaultRegularization };
    if (intervention) {
      if (options.intervention === 'clip') regularization.clipNorm = options.clipNorm;
      else regularization[options.intervention] = options.lambda;
    }
    const config: TrainingConfig = {
      spec: { ...defaultSpec, hidden: [8, 8], activation: 'tanh' },
      initialization: 'xavier',
      seed: options.seed,
      optimizer: { ...defaultOptimizer },
      epochs: options.epochs,
      batchSize: 12,
      loss: 'mse',
      regularization,
    };
    const source = trainingSource(dataset, split, prepared, config);
    let state = exhaust(initialSession(source.input));
    const initialHash = hashValue(networkWire(state.model));
    while (state.epoch < options.epochs) state = exhaust(advanceBatch(state, source.input));
    const weights = state.model.layers.flatMap((layer) => Array.from(layer.weights));
    runs.push({
      label: intervention
        ? options.intervention === 'clip'
          ? 'Recorte global'
          : options.intervention.toUpperCase()
        : 'Referencia sin intervención',
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
        false,
      ),
      weightNorm: stableNorm(weights),
      smallWeights: weights.filter((w) => Math.abs(w) < 0.01).length,
      weights: weights.length,
    });
  }
  return {
    options,
    runs,
    counts: {
      train: split.train.length,
      validation: split.validation.length,
      test: split.test.length,
    },
  };
}
