import { z } from '@/shared/validation';
import { importDatasetJson, jsonLimit } from '@/application/data/json-files';
import { generateDataset } from '@/domain/data/generate';
import { defaultGenerator, type Cell } from '@/domain/data/types';
import { splitDataset } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import {
  fitKnn,
  fitCart,
  predictClassical,
  type ClassicalData,
} from '@/domain/classical/estimators';
import { defaultSpec, forward } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';
import { classificationMetrics, regressionMetrics } from '@/domain/training/metrics';
import { trainStudyRun } from './study-run';
import { modelFromExperiment, exportInferenceModel } from './inference-model';
import { exportEstimator } from './classical-files';
import { optionsSchema } from './pipeline-schema';
import { utf8Length, hashValue } from '@/domain/data/integrity';
import { appVersion } from '@/shared/version';
export const classicalOptions = z.strictObject({
  recipe: z.enum(['moons', 'xor', 'circles', 'flowers', 'sine']),
  seed: z.number().int().min(0).max(0xffffffff),
  noise: z.number().min(0).max(0.4),
  k: z.number().int().min(1).max(15),
  depth: z.number().int().min(1).max(4),
  width: z.number().int().min(2).max(16),
  epochs: z.number().int().min(5).max(60),
  scaling: z.enum(['none', 'standard', 'minmax', 'robust']),
  datasetJson: z.string().max(jsonLimit).optional(),
  pipeline: optionsSchema.optional(),
  testPreviouslyConsulted: z.boolean(),
});
export type ClassicalOptions = z.infer<typeof classicalOptions>;
export const defaultClassicalOptions: ClassicalOptions = {
  recipe: 'moons',
  seed: 42,
  noise: 0.08,
  k: 5,
  depth: 3,
  width: 8,
  epochs: 30,
  scaling: 'standard',
  testPreviouslyConsulted: false,
};
export function compareClassical(raw: ClassicalOptions) {
  const options = classicalOptions.parse(raw);
  if (options.datasetJson && utf8Length(options.datasetJson) > 4 * 1024 * 1024)
    throw Error('CLASSICAL_FILE_SIZE');
  const source = options.datasetJson
    ? importDatasetJson(options.datasetJson)
    : (() => {
        const dataset = generateDataset({
          ...defaultGenerator,
          recipe: options.recipe,
          count: 240,
          seed: options.seed,
          noise: options.noise,
        });
        return {
          dataset,
          split: splitDataset(dataset, {
            strategy: dataset.task === 'regression' ? 'random' : 'stratified',
            ratios: [0.7, 0.15, 0.15],
            seed: options.seed,
          }),
        };
      })();
  const { dataset, split } = source;
  if (
    !split ||
    dataset.rows.length > 600 ||
    dataset.features.length > 8 ||
    !split.validation.length
  )
    throw Error('CLASSICAL_BUDGET_SPLIT');
  const pipelineOptions = options.pipeline ?? {
    featureIds: dataset.features.map((f) => f.id),
    imputation: 'mean' as const,
    scaling: options.scaling,
    missingIndicators: false,
  };
  const pipeline = fitPipeline(dataset, split, pipelineOptions),
    lookup = new Map(dataset.rows.map((r) => [r.id, r])),
    rows = (ids: string[]) => ids.map((id) => lookup.get(id)!);
  const train = rows(split.train),
    validation = rows(split.validation),
    classes = dataset.classOrder ?? [];
  const d: ClassicalData = {
    ids: [...split.train],
    x: train.map((r) => transformRow(r, pipeline)),
    y: train.map((r) =>
      dataset.task === 'regression' ? Number(r.target) : classes.indexOf(String(r.target)),
    ),
    featureIds: pipeline.outputFeatureIds,
    task: dataset.task,
    classes: Math.max(2, classes.length),
  };
  const operations =
    600 * options.epochs * (4 * train.length + validation.length) +
    2 * 32 * 16 * 4 * train.length * (d.classes + 2) +
    625 * train.length * d.featureIds.length;
  if (d.featureIds.length > 16 || operations > 1e8) throw Error('CLASSICAL_BUDGET');
  const knn = fitKnn(d, options.k),
    cart = fitCart(d, options.depth);
  const mlp = trainStudyRun(
    dataset,
    split,
    {
      spec: {
        ...defaultSpec,
        hidden: [options.width],
        task: dataset.task,
        classes: Math.max(2, classes.length),
      },
      seed: options.seed,
      initialization: 'xavier',
      optimizer: { ...defaultOptimizer },
      batchSize: 16,
      epochs: options.epochs,
      loss: 'mse',
    },
    'MLP',
    pipelineOptions,
    options.testPreviouslyConsulted,
  );
  const network = modelFromExperiment(mlp.experiment);
  if (hashValue(network.pipeline) !== hashValue(pipeline)) throw Error('PIPELINE_MISMATCH');
  const predict = (x: number[]) => {
    const out = Array.from(forward(network.network, x).activations.at(-1)!);
    const p = dataset.task === 'binary' ? [1 - out[0]!, out[0]!] : out;
    return {
      values: p,
      predicted:
        dataset.task === 'regression'
          ? p[0]!
          : dataset.task === 'binary'
            ? Number(p[1]! >= 0.5)
            : p.indexOf(Math.max(...p)),
    };
  };
  const predictors = [
    (x: number[]) => predictClassical(knn, x),
    (x: number[]) => predictClassical(cart, x),
    predict,
  ];
  const baseline = d.y.reduce((s, y) => s + y / d.y.length, 0),
    actual = validation.map((r) =>
      dataset.task === 'regression' ? Number(r.target) : classes.indexOf(String(r.target)),
    );
  const runs = predictors.map((fn, i) => {
    const predictions = validation.map((r) => fn(transformRow(r, pipeline)));
    return {
      family: (['knn', 'cart', 'mlp'] as const)[i]!,
      predictions: predictions.map((p) => p.predicted),
      metrics:
        dataset.task === 'regression'
          ? {
              kind: 'regression' as const,
              ...regressionMetrics(
                actual,
                predictions.map((p) => p.predicted),
                baseline,
              ),
            }
          : {
              kind: 'classification' as const,
              ...classificationMetrics(
                actual,
                predictions.map((p) =>
                  i === 2 && dataset.task === 'binary' ? [p.values[1]!] : p.values,
                ),
                classes.length,
              ),
            },
      cost:
        i === 0
          ? { label: 'Distancias para validar', value: train.length * validation.length }
          : i === 1
            ? { label: 'Umbrales examinados al ajustar', value: cart.candidates }
            : { label: 'Actualizaciones por lotes', value: mlp.experiment.checkpoint.updates },
    };
  });
  const numeric = dataset.features
      .filter(
        (f) =>
          f.kind === 'numeric' &&
          pipeline.inputFeatureIds.includes(f.id) &&
          train.some((r) => typeof r.features[f.id] === 'number'),
      )
      .slice(0, 2),
    baseFeatures = structuredClone(train[0]!.features);
  const axes = numeric.map((f) => {
    const values = train
      .map((r) => r.features[f.id])
      .filter((v): v is number => typeof v === 'number');
    const lo = Math.min(...values),
      hi = Math.max(...values),
      pad = Math.max(0.1, (hi - lo) * 0.1);
    return { id: f.id, label: f.name, min: lo - pad, max: hi + pad };
  });
  const grid = axes.length
    ? Array.from({ length: axes.length === 2 ? 625 : 81 }, (_, i) => {
        const features = { ...baseFeatures };
        features[axes[0]!.id] =
          axes[0]!.min +
          ((axes[0]!.max - axes[0]!.min) * (axes.length === 2 ? i % 25 : i)) /
            (axes.length === 2 ? 24 : 80);
        if (axes[1])
          features[axes[1].id] =
            axes[1].min + ((axes[1].max - axes[1].min) * Math.floor(i / 25)) / 24;
        const x = transformRow({ id: 'grid', origin: 'manual', target: null, features }, pipeline);
        return {
          features: Object.fromEntries(axes.map((a) => [a.id, features[a.id]!])),
          predictions: predictors.map((fn) => fn(x).predicted),
        };
      })
    : [];
  const probeRow = validation[0]!,
    probeX = transformRow(probeRow, pipeline);
  const provenance = {
    dataHash: split.dataHash,
    splitHash: split.splitHash,
    testPreviouslyConsulted: options.testPreviouslyConsulted,
  };
  return {
    appVersion,
    configuration: {
      recipe: options.datasetJson ? 'workspace' : options.recipe,
      seed: options.seed,
      k: options.k,
      depth: options.depth,
      width: options.width,
      epochs: options.epochs,
      pipelineOptions,
    },
    task: dataset.task,
    inputFeatures: dataset.features,
    classes,
    provenance,
    pipeline,
    operations,
    testEvaluated: false as const,
    testPreviouslyConsulted: options.testPreviouslyConsulted,
    trainIds: [...split.train],
    validationIds: [...split.validation],
    axes,
    baseFeatures,
    grid,
    points: [
      ...train.map((r) => ({ ...r, partition: 'train' as const })),
      ...validation.map((r) => ({ ...r, partition: 'validation' as const })),
    ],
    runs,
    probe: {
      features: probeRow.features,
      target: probeRow.target,
      knn: predictClassical(knn, probeX),
      cart: predictClassical(cart, probeX),
      mlp: predict(probeX),
    },
    tree: cart.root,
    artifacts: {
      knn: exportEstimator(
        dataset,
        split.train,
        pipelineOptions,
        { family: 'knn', k: options.k },
        provenance,
      ),
      cart: exportEstimator(
        dataset,
        split.train,
        pipelineOptions,
        { family: 'cart', maxDepth: options.depth },
        provenance,
      ),
      mlp: exportInferenceModel(network),
    },
  };
}
export type ClassicalResult = ReturnType<typeof compareClassical>;
export type EstimatorQuery = { text: string; features: Record<string, Cell> };
