import { validateDataset } from './validation';
import { derivedLabel, derivedValue, validateDerived, type DerivedFeature } from './derived';
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
  derived?: DerivedFeature[];
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
  version: 1 | 2 | 3;
  inputFeatureIds: string[];
  outputFeatureIds: string[];
  outputLabels: string[];
  fittedOn: { split: 'train'; idsHash: string };
  dataHash: string;
  splitHash: string;
  options: PipelineOptions;
  columns: (NumericState | CategoryState)[];
  derived?: NumericState[];
}
export function fitPipeline(
  dataset: Dataset,
  split: DataSplit,
  options: PipelineOptions,
): PipelineState {
  validateSplit(dataset, split);
  return fitTrainingPipeline(dataset, split.train, options, {
    dataHash: split.dataHash,
    splitHash: split.splitHash,
  });
}
/** Fits only the named training rows. Exported estimators use this to reconstruct their pipeline without holdout rows. */
export function fitTrainingPipeline(
  dataset: Dataset,
  trainIds: string[],
  options: PipelineOptions,
  provenance: { dataHash: string; splitHash: string },
): PipelineState {
  validateDataset(dataset);
  if (!/^[a-f0-9]{64}$/.test(provenance.dataHash) || !/^[a-f0-9]{64}$/.test(provenance.splitHash))
    throw new DataError('PIPELINE', 'provenance');
  const rowIds = new Set(dataset.rows.map((r) => r.id));
  if (
    !trainIds.length ||
    new Set(trainIds).size !== trainIds.length ||
    trainIds.some((id) => !rowIds.has(id))
  )
    throw new DataError('PIPELINE', 'train-ids');
  if (
    !['mean', 'median', 'mode'].includes(options.imputation) ||
    !['none', 'minmax', 'standard', 'robust'].includes(options.scaling) ||
    options.featureIds.length < 1 ||
    new Set(options.featureIds).size !== options.featureIds.length ||
    typeof options.missingIndicators !== 'boolean'
  )
    throw new DataError('PIPELINE');
  const lookup = new Map(dataset.rows.map((row) => [row.id, row]));
  const train = trainIds.map((id) => lookup.get(id)!);
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
  const derived: NumericState[] = [];
  if (options.derived) {
    const numeric = columns.filter((c): c is NumericState => c.kind === 'numeric');
    validateDerived(
      options.derived,
      numeric.map((c) => c.id),
    );
    const fills = new Map(numeric.map((c) => [c.id, c.fill]));
    const names = new Map(dataset.features.map((f) => [f.id, f.name]));
    for (const d of options.derived) {
      const values = train.map((row) => derivedValue(d, row, fills));
      const stats = numericStatistics(values),
        sorted = [...values].sort((a, b) => a - b);
      const q1 = quantile(sorted, 0.25),
        q3 = quantile(sorted, 0.75);
      derived.push({
        kind: 'numeric',
        id: d.id,
        fill: stats.mean,
        mean: stats.mean,
        std: stats.std,
        min: stats.min,
        max: stats.max,
        constant: stats.min === stats.max,
        ...(options.scaling === 'robust'
          ? { robust: { median: stats.median, q1, q3, iqr: q3 - q1 } }
          : {}),
      });
      outputFeatureIds.push('derived:' + d.id + ':numeric');
      outputLabels.push(derivedLabel(d, names));
    }
    if (outputFeatureIds.length > 32) throw new DataError('DIMENSIONS');
  }
  return {
    version: options.derived ? 3 : options.scaling === 'robust' ? 2 : 1,
    inputFeatureIds: [...options.featureIds],
    outputFeatureIds,
    outputLabels,
    fittedOn: { split: 'train', idsHash: hashValue(trainIds) },
    dataHash: provenance.dataHash,
    splitHash: provenance.splitHash,
    options: {
      ...options,
      featureIds: [...options.featureIds],
      ...(options.derived ? { derived: structuredClone(options.derived) } : {}),
    },
    columns,
    ...(options.derived ? { derived } : {}),
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
      const scaled = scaleNumeric(value, column, state.options.scaling);
      output.push(scaled);
    } else {
      const index = column.vocabulary.indexOf(String(value));
      output.push(...column.vocabulary.map((_, i) => Number(i === index)), Number(index === -1));
    }
    if (state.options.missingIndicators) output.push(Number(raw === null));
  }
  if (state.options.derived) {
    const fills = new Map(
      state.columns
        .filter((c): c is NumericState => c.kind === 'numeric')
        .map((c) => [c.id, c.fill]),
    );
    state.options.derived.forEach((d, i) =>
      output.push(
        scaleNumeric(derivedValue(d, row, fills), state.derived![i]!, state.options.scaling),
      ),
    );
  }
  return output;
}
export function scaleNumeric(value: number, column: NumericState, scaling: Scaling): number {
  const scaled =
    scaling === 'none'
      ? value
      : column.constant
        ? 0
        : scaling === 'minmax'
          ? (value - column.min) / (column.max - column.min)
          : scaling === 'robust'
            ? (value - column.robust!.median) / (column.robust!.iqr || 1)
            : (value - column.mean) / (column.std || 1);
  if (!Number.isFinite(scaled)) throw new DataError('NON_FINITE', column.id);
  return scaled;
}
