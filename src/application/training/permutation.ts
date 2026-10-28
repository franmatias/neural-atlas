import { networkWire } from './network-schema';
import { z } from '@/shared/validation';
import { forward, parameterCount } from '@/domain/network/model';
import { outputLoss } from '@/domain/network/backprop';
import { transformRow } from '@/domain/data/pipeline';
import { shuffle, createRandom, validateSeed } from '@/domain/random/seeded';
import { hashValue, utf8Length } from '@/domain/data/integrity';
import type { Sample } from '@/domain/data/types';
import { defaultGenerator } from '@/domain/data/types';
import { generateDataset } from '@/domain/data/generate';
import { splitDataset } from '@/domain/data/split';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { trainStudyRun } from './study-run';
import { importExperiment, prepareExperiment } from './experiment';
import {
  modelFromExperiment,
  exportInferenceModel,
  validateInferenceModel,
  type InferenceModel,
} from './inference-model';
import { appVersion } from '@/shared/version';
export const permutationOptions = z.strictObject({
  recipe: z.enum(['moons', 'flowers', 'sine', 'correlated']),
  seed: z.number().int().min(0).max(0xffffffff),
  repetitions: z.number().int().min(2).max(10),
  epochs: z.number().int().min(5).max(60),
  experimentJson: z
    .string()
    .max(8 * 1024 * 1024)
    .optional(),
});
export type PermutationOptions = z.infer<typeof permutationOptions>;
export const defaultPermutation: PermutationOptions = {
  recipe: 'sine',
  seed: 42,
  repetitions: 5,
  epochs: 30,
};
export function permuteRows(rows: Sample[], feature: string, seed: number, repeat: number) {
  validateSeed(seed);
  if (
    !Number.isInteger(repeat) ||
    repeat < 0 ||
    repeat >= 10 ||
    !rows.length ||
    rows.some((r) => !Object.hasOwn(r.features, feature))
  )
    throw Error('PERMUTATION_INPUT');
  const order = shuffle(
    rows.map((_, i) => i),
    seed,
    `permutation-${repeat}`,
  );
  return {
    order,
    rows: rows.map((r, i) => ({
      ...r,
      features: { ...r.features, [feature]: rows[order[i]!]!.features[feature]! },
    })),
  };
}
export function measurePermutation(
  model: InferenceModel,
  rows: Sample[],
  seed: number,
  repetitions: number,
) {
  validateInferenceModel(model);
  validateSeed(seed);
  const features = model.features;
  const operations =
    parameterCount(model.network.spec) * rows.length * (1 + features.length * repetitions);
  if (
    rows.length < 2 ||
    rows.length > 600 ||
    new Set(rows.map((r) => r.id)).size !== rows.length ||
    features.length > 8 ||
    model.pipeline.outputFeatureIds.length > 16 ||
    parameterCount(model.network.spec) > 5000 ||
    !Number.isInteger(repetitions) ||
    repetitions < 2 ||
    repetitions > 10 ||
    operations > 2e7
  )
    throw Error('PERMUTATION_BUDGET');
  const snapshot = hashValue({ network: networkWire(model.network), pipeline: model.pipeline });
  function evaluate(samples: Sample[]) {
    const losses = samples.map((row) => {
      const target =
        model.task === 'regression' ? row.target : model.classOrder.indexOf(String(row.target));
      if (typeof target !== 'number' || !Number.isFinite(target) || row.target === null)
        throw Error('PERMUTATION_TARGET');
      return outputLoss(
        model.network,
        forward(model.network, transformRow(row, model.pipeline)),
        target,
        'mse',
      ).value;
    });
    return { loss: losses.reduce((a, b) => a + b / losses.length, 0), losses };
  }
  const baseline = evaluate(rows);
  const results = features.map((feature) => {
    const trials = Array.from({ length: repetitions }, (_, repeat) => {
      const p = permuteRows(rows, feature.id, seed, repeat),
        value = evaluate(p.rows);
      return {
        repeat,
        loss: value.loss,
        delta: value.loss - baseline.loss,
        order: p.order,
        losses: value.losses,
      };
    });
    const mean = trials.reduce((s, t) => s + t.delta / repetitions, 0),
      deviation = Math.sqrt(
        trials.reduce((s, t) => s + (t.delta - mean) ** 2, 0) / (repetitions - 1),
      );
    if (!Number.isFinite(mean) || !Number.isFinite(deviation))
      throw Error('PERMUTATION_NON_FINITE');
    return { id: feature.id, name: feature.name, mean, deviation, trials };
  });
  if (hashValue({ network: networkWire(model.network), pipeline: model.pipeline }) !== snapshot)
    throw Error('PERMUTATION_MUTATION');
  return { baseline, results, operations, snapshot };
}
export function permutationStudy(raw: PermutationOptions) {
  const options = permutationOptions.parse(raw);
  if (options.experimentJson && utf8Length(options.experimentJson) > 8 * 1024 * 1024)
    throw Error('PERMUTATION_SIZE');
  let experiment;
  if (options.experimentJson) experiment = importExperiment(options.experimentJson);
  else {
    const dataset = generateDataset({
      ...defaultGenerator,
      recipe: options.recipe === 'correlated' ? 'sine' : options.recipe,
      count: 160,
      seed: 42,
    });
    if (options.recipe === 'correlated') {
      delete dataset.recipe;
      dataset.features.push({ id: 'irrelevant', name: 'Ruido independiente', kind: 'numeric' });
      const rng = createRandom(42, 'permutation-noise');
      dataset.rows.forEach((r) => {
        r.features.x2 = r.features.x1!;
        r.features.irrelevant = rng.normal();
      });
    }
    const split = splitDataset(dataset, {
      strategy: dataset.task === 'regression' ? 'random' : 'stratified',
      ratios: [0.6, 0.2, 0.2],
      seed: 42,
    });
    experiment = trainStudyRun(
      dataset,
      split,
      {
        spec: {
          ...defaultSpec,
          hidden: [8],
          task: dataset.task,
          classes: Math.max(2, dataset.classOrder?.length ?? 2),
        },
        seed: 42,
        initialization: 'xavier',
        optimizer: { ...defaultOptimizer },
        epochs: options.epochs,
        batchSize: 16,
        loss: 'mse',
      },
      'Red independiente de permutación',
    ).experiment;
  }
  const { dataset, split } = prepareExperiment(experiment);
  if (dataset.rows.length > 600 || dataset.features.length > 8) throw Error('PERMUTATION_SOURCE');
  const model = modelFromExperiment(experiment),
    lookup = new Map(dataset.rows.map((r) => [r.id, r]));
  const rows = split.validation.map((id) => lookup.get(id)!);
  const measured = measurePermutation(model, rows, options.seed, options.repetitions);
  return {
    appVersion,
    source: options.experimentJson ? 'checkpoint' : 'synthetic',
    recipe: options.experimentJson ? null : options.recipe,
    settings: { seed: options.seed, repetitions: options.repetitions },
    task: dataset.task,
    metric: dataset.task === 'regression' ? 'MSE' : dataset.task === 'binary' ? 'BCE' : 'CCE',
    provenance: {
      dataHash: split.dataHash,
      splitHash: split.splitHash,
      pipelineHash: model.hashes.pipelineHash,
      networkHash: model.hashes.networkHash,
      testPreviouslyConsulted: experiment.testConsulted,
    },
    validationIds: [...split.validation],
    rows,
    ...measured,
    model: exportInferenceModel(model),
    testEvaluated: false as const,
  };
}
export type PermutationResult = ReturnType<typeof permutationStudy>;
export function exportPermutationReport(result: PermutationResult) {
  const { rows, model, results, baseline, ...metadata } = result;
  void rows;
  void model;
  return JSON.stringify(
    {
      format: 'neural-atlas.permutation-report',
      schemaVersion: 1,
      ...metadata,
      baseline: { loss: baseline.loss },
      results: results.map(({ trials, ...r }) => ({
        ...r,
        trials: trials.map(({ repeat, loss, delta }) => ({ repeat, loss, delta })),
      })),
    },
    null,
    2,
  );
}
