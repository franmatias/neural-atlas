import { DataError, type Dataset, type DataSplit } from '@/domain/data/types';
import { datasetHash, utf8Length } from '@/domain/data/integrity';
import { validateDataset } from '@/domain/data/validation';
import { validateSplit } from '@/domain/data/split';
import { datasetFileSchema } from './json-schema';
export const jsonLimit = 32 * 1024 * 1024;
export function guardJson(value: unknown, depth = 0): void {
  if (depth > 20) throw new DataError('LIMIT', 'depth');
  if (typeof value === 'string' && value.length > 4096) throw new DataError('LIMIT', 'cell');
  if (value && typeof value === 'object')
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key))
        throw new DataError('SCHEMA', key);
      guardJson(child, depth + 1);
    }
}
export function importDatasetJson(text: string): { dataset: Dataset; split?: DataSplit } {
  if (utf8Length(text) > jsonLimit) throw new DataError('LIMIT', 'JSON');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DataError('SCHEMA', 'JSON');
  }
  guardJson(raw);
  const parsed = datasetFileSchema.safeParse(raw);
  if (!parsed.success)
    throw new DataError(
      'SCHEMA',
      parsed.error.issues
        .slice(0, 5)
        .map((issue) => issue.path.join('.'))
        .join(', '),
    );
  const { dataset: d, split, dataHash } = parsed.data;
  const size = d.rowIds.length;
  const arrays = [
    d.targets,
    d.origins,
    ...Object.values(d.columns),
    ...(d.groupIds ? [d.groupIds] : []),
    ...(d.timestamps ? [d.timestamps] : []),
    ...(d.annotations ? [d.annotations] : []),
  ];
  if (
    arrays.some((a) => a.length !== size) ||
    Object.keys(d.columns).length !== d.features.length ||
    d.features.some((f) => !Object.hasOwn(d.columns, f.id))
  )
    throw new DataError('SCHEMA', 'columns');
  if (
    d.recipe &&
    (d.recipe.id !== d.recipe.options.recipe || d.recipe.seed !== d.recipe.options.seed)
  )
    throw new DataError('SCHEMA', 'recipe');
  const dataset: Dataset = {
    id: d.id,
    revision: d.revision,
    task: d.task,
    targetName: d.targetName,
    features: d.features,
    ...(d.classOrder ? { classOrder: d.classOrder } : {}),
    ...(d.recipe ? { recipe: d.recipe } : {}),
    rows: d.rowIds.map((id, i) => ({
      id,
      features: Object.fromEntries(d.features.map((f) => [f.id, d.columns[f.id]![i]!])),
      target: d.targets[i]!,
      origin: d.origins[i]!,
      ...(d.groupIds?.[i] ? { groupId: d.groupIds[i]! } : {}),
      ...(d.timestamps?.[i] ? { timestamp: d.timestamps[i]! } : {}),
      ...(d.annotations?.[i] ? { annotation: d.annotations[i]! } : {}),
    })),
  };
  validateDataset(dataset);
  if (dataHash && dataHash !== datasetHash(dataset)) throw new DataError('INTEGRITY', 'dataHash');
  if (split) validateSplit(dataset, split);
  return { dataset, ...(split ? { split } : {}) };
}
export function exportDatasetJson(dataset: Dataset, split?: DataSplit): string {
  validateDataset(dataset);
  if (split) validateSplit(dataset, split);
  const file = {
    format: 'neural-atlas.dataset',
    schemaVersion: 1,
    dataHash: datasetHash(dataset),
    provenance: {
      appVersion: '0.5.0',
      synthetic: Boolean(dataset.recipe),
      recipeExact: Boolean(dataset.recipe) && dataset.revision === 1,
    },
    dataset: {
      id: dataset.id,
      revision: dataset.revision,
      task: dataset.task,
      features: dataset.features,
      targetName: dataset.targetName,
      rowIds: dataset.rows.map((r) => r.id),
      columns: Object.fromEntries(
        dataset.features.map((f) => [f.id, dataset.rows.map((r) => r.features[f.id])]),
      ),
      targets: dataset.rows.map((r) => r.target),
      origins: dataset.rows.map((r) => r.origin),
      groupIds: dataset.rows.map((r) => r.groupId ?? null),
      timestamps: dataset.rows.map((r) => r.timestamp ?? null),
      annotations: dataset.rows.map((r) => r.annotation ?? null),
      ...(dataset.classOrder ? { classOrder: dataset.classOrder } : {}),
      ...(dataset.recipe ? { recipe: dataset.recipe } : {}),
    },
    ...(split ? { split } : {}),
  };
  const text = JSON.stringify(file);
  if (utf8Length(text) > jsonLimit) throw new DataError('LIMIT', 'JSON');
  return text;
}
