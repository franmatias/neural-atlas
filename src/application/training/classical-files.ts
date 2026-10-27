import { z } from '@/shared/validation';
import { guardJson, exportDatasetJson, importDatasetJson } from '@/application/data/json-files';
import { optionsSchema } from './pipeline-schema';
import { fitTrainingPipeline, transformRow } from '@/domain/data/pipeline';
import {
  fitKnn,
  fitCart,
  predictClassical,
  type ClassicalData,
} from '@/domain/classical/estimators';
import { hashValue, utf8Length } from '@/domain/data/integrity';
import type { Dataset, Cell } from '@/domain/data/types';
import { appVersion } from '@/shared/version';
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const estimatorSpec = z.discriminatedUnion('family', [
  z.strictObject({ family: z.literal('knn'), k: z.number().int().min(1).max(15) }),
  z.strictObject({ family: z.literal('cart'), maxDepth: z.number().int().min(1).max(4) }),
]);
export type EstimatorSpec = z.infer<typeof estimatorSpec>;
const fileSchema = z.strictObject({
  format: z.literal('neural-atlas.estimator'),
  schemaVersion: z.literal(1),
  algorithmVersion: z.literal(1),
  appVersion: z.string().max(32),
  spec: estimatorSpec,
  trainingDataset: z.unknown(),
  pipelineOptions: optionsSchema,
  provenance: z.strictObject({
    dataHash: hash,
    splitHash: hash,
    testPreviouslyConsulted: z.boolean(),
  }),
  learned: z.unknown(),
  learnedHash: hash,
  integrity: hash,
});
export function rebuildEstimator(
  trainingDataset: Dataset,
  options: z.infer<typeof optionsSchema>,
  spec: EstimatorSpec,
  provenance: { dataHash: string; splitHash: string; testPreviouslyConsulted: boolean },
) {
  if (trainingDataset.rows.length > 600 || trainingDataset.features.length > 8)
    throw Error('ESTIMATOR_BUDGET');
  const pipeline = fitTrainingPipeline(
    trainingDataset,
    trainingDataset.rows.map((r) => r.id),
    options,
    provenance,
  );
  const d: ClassicalData = {
    ids: trainingDataset.rows.map((r) => r.id),
    x: trainingDataset.rows.map((r) => transformRow(r, pipeline)),
    y: trainingDataset.rows.map((r) =>
      trainingDataset.task === 'regression'
        ? Number(r.target)
        : (trainingDataset.classOrder ?? []).indexOf(String(r.target)),
    ),
    featureIds: pipeline.outputFeatureIds,
    task: trainingDataset.task,
    classes: Math.max(2, trainingDataset.classOrder?.length ?? 0),
  };
  const model = spec.family === 'knn' ? fitKnn(d, spec.k) : fitCart(d, spec.maxDepth);
  return { trainingDataset, pipeline, model, provenance };
}
export function exportEstimator(
  dataset: Dataset,
  trainIds: string[],
  options: z.infer<typeof optionsSchema>,
  spec: EstimatorSpec,
  provenance: { dataHash: string; splitHash: string; testPreviouslyConsulted: boolean },
) {
  const lookup = new Map(dataset.rows.map((r) => [r.id, r]));
  if (new Set(trainIds).size !== trainIds.length || trainIds.some((id) => !lookup.has(id)))
    throw Error('TRAIN_IDS');
  const train: Dataset = {
    id: dataset.id,
    revision: dataset.revision,
    task: dataset.task,
    targetName: dataset.targetName,
    features: structuredClone(dataset.features),
    ...(dataset.classOrder ? { classOrder: [...dataset.classOrder] } : {}),
    rows: trainIds.map((id) => structuredClone(lookup.get(id)!)),
  };
  const fitted = rebuildEstimator(train, options, estimatorSpec.parse(spec), provenance),
    learned = { pipeline: fitted.pipeline, model: fitted.model };
  const payload = {
    format: 'neural-atlas.estimator' as const,
    schemaVersion: 1 as const,
    algorithmVersion: 1 as const,
    appVersion,
    spec,
    trainingDataset: JSON.parse(exportDatasetJson(train)) as unknown,
    pipelineOptions: options,
    provenance,
    learned,
    learnedHash: hashValue(learned),
  };
  const text = JSON.stringify({ ...payload, integrity: hashValue(payload) });
  if (utf8Length(text) > 8 * 1024 * 1024) throw Error('ESTIMATOR_SIZE');
  return text;
}
export function importEstimator(text: string) {
  if (utf8Length(text) > 8 * 1024 * 1024) throw Error('ESTIMATOR_SIZE');
  const raw: unknown = JSON.parse(text);
  guardJson(raw);
  const { integrity, ...file } = fileSchema.parse(raw);
  if (integrity !== hashValue(file)) throw Error('ESTIMATOR_INTEGRITY');
  const parsed = importDatasetJson(JSON.stringify(file.trainingDataset));
  if (parsed.split) throw Error('TRAIN_ONLY_FILE');
  const fit = rebuildEstimator(parsed.dataset, file.pipelineOptions, file.spec, file.provenance);
  if (
    file.learnedHash !== hashValue(file.learned) ||
    file.learnedHash !== hashValue({ pipeline: fit.pipeline, model: fit.model })
  )
    throw Error('ESTIMATOR_FIT');
  return fit;
}
export function predictEstimatorFile(text: string, features: Record<string, Cell>) {
  const fitted = importEstimator(text),
    specs = fitted.trainingDataset.features;
  if (
    Object.keys(features).length !== specs.length ||
    specs.some(
      (f) =>
        !(f.id in features) ||
        (f.kind === 'numeric' && features[f.id] !== null && typeof features[f.id] !== 'number'),
    )
  )
    throw Error('ESTIMATOR_INPUT');
  return {
    features: structuredClone(features),
    ...predictClassical(
      fitted.model,
      transformRow({ id: 'probe', origin: 'manual', target: null, features }, fitted.pipeline),
    ),
  };
}
