import { z } from '@/shared/validation';
import { appVersion } from '@/shared/version';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { defaultSpec, parameterCount } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { defaultRegularization } from '@/domain/training/regularization';
import { describe, type Distribution } from './multiseed';
import { trainStudyRun } from './study-run';
import type { GeneralizationRun } from './generalization';

export const capacityOptions = z.strictObject({
  dataSeed: z.number().int().min(0).max(0xffffffff),
  firstSeed: z.number().int().min(0).max(0xffffffff),
  repetitions: z.union([z.literal(3), z.literal(5)]),
  recipe: z.enum(['moons', 'circles', 'xor']),
  noise: z.number().finite().min(0).max(0.4),
  epochs: z.number().int().min(5).max(120),
});
export type CapacityOptions = z.infer<typeof capacityOptions>;
export const defaultCapacity: CapacityOptions = {
  dataSeed: 42,
  firstSeed: 42,
  repetitions: 3,
  recipe: 'moons',
  noise: 0.2,
  epochs: 40,
};
export const capacities = [
  { id: 'linear', label: 'Logística · 2→1', hidden: [] as number[] },
  { id: 'small', label: 'Pequeña · 2→2→1', hidden: [2] },
  { id: 'large', label: 'Amplia · 2→16→16→1', hidden: [16, 16] },
] as const;
export type CapacityId = (typeof capacities)[number]['id'];
export interface CapacityTrial {
  seed: number;
  size: number;
  capacity: CapacityId;
  parameters: number;
  run: GeneralizationRun;
}
export interface CapacitySummary {
  capacity: CapacityId;
  size: number;
  parameters: number;
  train: Distribution;
  validation: Distribution;
  gap: Distribution;
}
export interface CapacityResult {
  options: CapacityOptions;
  trials: CapacityTrial[];
  summary: CapacitySummary[];
}
/** Nested, balanced train prefixes. Each size refits preprocessing; validation/test stay fixed. */
export function compareCapacity(raw: CapacityOptions): CapacityResult {
  const options = capacityOptions.parse(raw);
  const dataset = generateDataset({
    ...defaultGenerator,
    recipe: options.recipe,
    count: 120,
    noise: options.noise,
    seed: options.dataSeed,
  });
  const trials: CapacityTrial[] = [];
  const summary: CapacitySummary[] = [];
  for (const size of [24, 48, 72]) {
    const split = splitDataset(dataset, {
      strategy: 'stratified',
      ratios: [0.6, 0.2, 0.2],
      seed: options.dataSeed,
      selection: { kind: 'balanced-prefix-v1', count: size, seed: options.dataSeed },
    });
    for (const capacity of capacities) {
      const spec = { ...defaultSpec, hidden: [...capacity.hidden] };
      const parameters = parameterCount(spec);
      const points = [];
      for (let i = 0; i < options.repetitions; i++) {
        const seed = (options.firstSeed + i) >>> 0;
        const run = trainStudyRun(
          dataset,
          split,
          {
            spec,
            initialization: 'xavier',
            seed,
            optimizer: { ...defaultOptimizer },
            epochs: options.epochs,
            batchSize: 12,
            loss: 'mse',
            regularization: { ...defaultRegularization },
          },
          capacity.label,
        );
        trials.push({ size, seed, capacity: capacity.id, parameters, run });
        points.push(run.experiment.checkpoint.history.at(-1)!);
      }
      summary.push({
        size,
        capacity: capacity.id,
        parameters,
        train: describe(points.map((p) => p.trainLoss)),
        validation: describe(points.map((p) => p.validationLoss)),
        gap: describe(points.map((p) => p.validationLoss - p.trainLoss)),
      });
    }
  }
  return { options, trials, summary };
}
export function exportCapacity(result: CapacityResult): string {
  return JSON.stringify(
    {
      format: 'neural-atlas.capacity-report',
      schemaVersion: 1,
      appVersion,
      options: result.options,
      summary: result.summary,
      measurements: result.trials.map((t) => ({
        seed: t.seed,
        size: t.size,
        capacity: t.capacity,
        parameters: t.parameters,
        initialHash: t.run.initialHash,
        pipelineHash: t.run.experiment.pipelineHash,
        configHash: t.run.experiment.checkpoint.configHash,
        point: t.run.experiment.checkpoint.history.at(-1),
        updates: t.run.experiment.checkpoint.updates,
      })),
      testConsulted: false,
    },
    null,
    2,
  );
}
