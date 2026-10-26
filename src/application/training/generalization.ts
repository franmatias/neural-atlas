import { z } from '@/shared/validation';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { type TrainingConfig } from '@/domain/training/session';
import { defaultRegularization } from '@/domain/training/regularization';
import { trainStudyRun } from './study-run';
import { type Experiment } from './experiment';
import type { AugmentationReport } from '@/domain/data/augmentation';
export const generalizationOptions = z.strictObject({
  seed: z.number().int().min(0).max(4294967295),
  noise: z.number().finite().min(0).max(0.4),
  epochs: z.number().int().min(5).max(120),
  intervention: z.enum(['l1', 'l2', 'clip', 'early', 'dropout', 'bn', 'augmentation']),
  augmentationPolicy: z.enum(['circles', 'xor']),
  augmentationSigma: z.number().finite().min(0).max(0.01),
  augmentationCopies: z.number().int().min(1).max(3),
  dropoutRate: z.number().finite().min(0).max(0.8),
  patience: z.number().int().min(5).max(100),
  minDelta: z.number().finite().min(0).max(0.01),
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
  patience: 10,
  minDelta: 0.001,
  dropoutRate: 0.5,
  augmentationPolicy: 'circles',
  augmentationSigma: 0.01,
  augmentationCopies: 1,
};
export interface GeneralizationRun {
  label: string;
  initialHash: string;
  experiment: Experiment;
  weightNorm: number;
  smallWeights: number;
  weights: number;
  trainingRows: number;
  augmentation?: AugmentationReport;
}
export interface GeneralizationResult {
  options: GeneralizationOptions;
  runs: GeneralizationRun[];
  counts: { train: number; validation: number; test: number };
}
/** Matched synthetic runs: one intervention, no test scoring and no live laboratory mutation. */
export function compareGeneralization(
  raw: GeneralizationOptions,
  trainingSeed?: number,
): GeneralizationResult {
  const options = generalizationOptions.parse(raw);
  const seed = z
    .number()
    .int()
    .min(0)
    .max(4294967295)
    .parse(trainingSeed ?? options.seed);
  const dataset = generateDataset({
    ...defaultGenerator,
    recipe: options.intervention === 'augmentation' ? options.augmentationPolicy : 'moons',
    count: 120,
    noise: options.noise,
    seed: options.seed,
  });
  const split = splitDataset(dataset, {
    strategy: 'stratified',
    ratios: [0.6, 0.2, 0.2],
    seed: options.seed,
  });
  const runs: GeneralizationRun[] = [];
  for (const intervention of [false, true]) {
    const regularization = { ...defaultRegularization };
    if (intervention) {
      if (options.intervention === 'clip') regularization.clipNorm = options.clipNorm;
      else if (options.intervention === 'l1' || options.intervention === 'l2')
        regularization[options.intervention] = options.lambda;
    }
    const config: TrainingConfig = {
      spec: {
        ...defaultSpec,
        hidden: [8, 8],
        activation: 'tanh',
        ...(intervention && options.intervention === 'bn'
          ? { batchNormalization: true as const }
          : {}),
      },
      initialization: 'xavier',
      seed,
      optimizer: { ...defaultOptimizer },
      epochs: options.epochs,
      batchSize: 12,
      loss: 'mse',
      regularization,
      ...(intervention && options.intervention === 'augmentation'
        ? {
            augmentation: {
              policy: options.augmentationPolicy,
              sigma: options.augmentationSigma,
              copies: options.augmentationCopies,
              seed: options.seed,
            },
          }
        : {}),
      ...(intervention && options.intervention === 'dropout'
        ? { dropout: { rate: options.dropoutRate } }
        : {}),
      ...(intervention && options.intervention === 'early'
        ? { earlyStopping: { patience: options.patience, minDelta: options.minDelta } }
        : {}),
    };
    const label = intervention
      ? options.intervention === 'augmentation'
        ? 'Aumento de datos'
        : options.intervention === 'dropout'
          ? 'Dropout invertido'
          : options.intervention === 'early'
            ? 'Parada temprana'
            : options.intervention === 'clip'
              ? 'Recorte global'
              : options.intervention.toUpperCase()
      : 'Referencia sin intervención';
    runs.push(trainStudyRun(dataset, split, config, label));
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
