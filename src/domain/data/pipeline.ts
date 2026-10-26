import { hashValue } from './integrity';
import { mode, numericStatistics, quantile } from './statistics';
import { DataError, type Cell, type DataSplit, type Dataset, type Sample } from './types';
import { validateSplit } from './split';
export type Scaling = 'none' | 'minmax' | 'standard' | 'robust';
export type Imputation = 'mean' | 'median' | 'mode';
export interface PipelineOptions {
  featureIds: string[];
  imputation: Imputation;
  scaling: Scaling;
  missingIndicators: boolean;
}
export interface NumericState {
  kind: 'numeric';
  id: string;
  fill: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  constant: boolean;
  robust?: { median: number; q1: number; q3: number; iqr: number };
}
export interface CategoryState {
  kind: 'categorical';
  id: string;
  fill: string;
  vocabulary: string[];
}
export interface PipelineState {
  version: 1 | 2;
  inputFeatureIds: string[];
  outputFeatureIds: string[];
  outputLabels: string[];
  fittedOn: { split: 'train'; idsHash: string };
  dataHash: string;
  splitHash: string;
  options: PipelineOptions;
  columns: (NumericState | CategoryState)[];
}
export function fitPipeline(
  dataset: Dataset,
  split: DataSplit,
  options: PipelineOptions,
): PipelineState {
  validateSplit(dataset, split);
  if (
    !['mean', 'median', 'mode'].includes(options.imputation) ||
    !['none', 'minmax', 'standard', 'robust'].includes(options.scaling) ||
    options.featureIds.length < 1 ||
    new Set(options.featureIds).size !== options.featureIds.length ||
    typeof options.missingIndicators !== 'boolean'
  )
    throw new DataError('PIPELINE');
  const lookup = new Map(dataset.rows.map((row) => [row.id, row]));
  const train = split.train.map((id) => lookup.get(id)!);
  if (!train.length) throw new DataError('PIPELINE', 'train');
  const columns: PipelineState['columns'] = [];
  const outputFeatureIds: string[] = [];
  const outputLabels: string[] = [];
  for (const id of options.featureIds) {
    const feature = dataset.features.find((f) => f.id === id);
    if (!feature) throw new DataError('PIPELINE', id);
    const observed = train
      .map((row) => row.features[id]!)
      .filter((value): value is Exclude<Cell, null> => value !== null);
    if (!observed.length) throw new DataError('ALL_MISSING', feature.name);
    if (feature.kind === 'numeric') {
      const values = observed as number[];
      const original = numericStatistics(values);
      const fill =
        options.imputation === 'mean'
          ? original.mean
          : options.imputation === 'median'
            ? original.median
            : mode(values);
      const stats = numericStatistics(
        train.map((row) => (row.features[id] === null ? fill : (row.features[id] as number))),
      );
      const sorted =
        options.scaling === 'robust'
          ? train
              .map((row) => (row.features[id] === null ? fill : (row.features[id] as number)))
              .sort((a, b) => a - b)
          : [];
      const q1 = sorted.length ? quantile(sorted, 0.25) : 0;
      const q3 = sorted.length ? quantile(sorted, 0.75) : 0;
      columns.push({
        kind: 'numeric',
        id,
        fill,
        mean: stats.mean,
        std: stats.std,
        min: stats.min,
        max: stats.max,
        constant: stats.max === stats.min,
        ...(options.scaling === 'robust'
          ? { robust: { median: stats.median, q1, q3, iqr: q3 - q1 } }
          : {}),
      });
      outputFeatureIds.push(`${id}:numeric`);
      outputLabels.push(feature.name);
    } else {
      const vocabulary = [...new Set(observed as string[])];
      columns.push({ kind: 'categorical', id, fill: mode(observed as string[]), vocabulary });
      outputFeatureIds.push(...vocabulary.map((_, i) => `${id}:category:${i}`), `${id}:unknown`);
      outputLabels.push(...vocabulary.map((c) => `${feature.name} = ${c}`), `${feature.name} = ?`);
    }
    if (options.missingIndicators) {
      outputFeatureIds.push(`${id}:missing`);
      outputLabels.push(`isMissing(${feature.name})`);
    }
    if (outputFeatureIds.length > 32) throw new DataError('DIMENSIONS');
  }
  return {
    version: options.scaling === 'robust' ? 2 : 1,
    inputFeatureIds: [...options.featureIds],
    outputFeatureIds,
    outputLabels,
    fittedOn: { split: 'train', idsHash: hashValue(split.train) },
    dataHash: split.dataHash,
    splitHash: split.splitHash,
    options: { ...options, featureIds: [...options.featureIds] },
    columns,
  };
}
export function transformRow(row: Sample, state: PipelineState): number[] {
  const output: number[] = [];
  for (const column of state.columns) {
    const raw = row.features[column.id];
    if (raw === undefined) throw new DataError('PIPELINE', column.id);
    const value = raw === null ? column.fill : raw;
    if (column.kind === 'numeric') {
      if (typeof value !== 'number') throw new DataError('PIPELINE', column.id);
      const scaled =
        state.options.scaling === 'none'
          ? value
          : column.constant
            ? 0
            : state.options.scaling === 'minmax'
              ? (value - column.min) / (column.max - column.min)
              : state.options.scaling === 'robust'
                ? (value - column.robust!.median) / (column.robust!.iqr || 1)
                : (value - column.mean) / (column.std || 1);
      if (!Number.isFinite(scaled)) throw new DataError('NON_FINITE', column.id);
      output.push(scaled);
    } else {
      const index = column.vocabulary.indexOf(String(value));
      output.push(...column.vocabulary.map((_, i) => Number(i === index)), Number(index === -1));
    }
    if (state.options.missingIndicators) output.push(Number(raw === null));
  }
  return output;
}
