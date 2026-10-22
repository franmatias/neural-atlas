export type Task = 'binary' | 'multiclass' | 'regression';
export type Cell = number | string | null;
export type Origin = 'generated' | 'imported' | 'manual' | 'augmented';
export type Defect = 'noise' | 'outlier' | 'label' | 'missing' | 'duplicate';
export interface FeatureSpec {
  id: string;
  name: string;
  kind: 'numeric' | 'categorical';
  unit?: string;
}
export interface Sample {
  id: string;
  groupId?: string;
  timestamp?: string;
  features: Record<string, Cell>;
  target: number | string | null;
  origin: Origin;
  annotation?: { defects: Defect[]; cleanTarget: number | string; sourceId?: string };
}
export interface Dataset {
  id: string;
  revision: number;
  task: Task;
  features: FeatureSpec[];
  targetName: string;
  rows: Sample[];
  classOrder?: string[];
  recipe?: { id: RecipeId; version: 1; seed: number; options: GeneratorOptions };
}
export const recipeIds = [
  'clouds',
  'moons',
  'circles',
  'xor',
  'spirals',
  'flowers',
  'energy',
  'sine',
] as const;
export type RecipeId = (typeof recipeIds)[number];
export interface GeneratorOptions {
  recipe: RecipeId;
  count: number;
  seed: number;
  noise: number;
  outliers: number;
  labelNoise: number;
  missing: number;
  duplicates: number;
  minority: number;
}
export type SplitName = 'train' | 'validation' | 'test';
export const splitNames: readonly SplitName[] = ['train', 'validation', 'test'];
export type SplitStrategy = 'random' | 'stratified' | 'grouped' | 'stratified-grouped' | 'temporal';
export interface SplitOptions {
  strategy: SplitStrategy;
  seed: number;
  ratios: readonly [number, number, number];
}
export interface DataSplit {
  strategy: SplitStrategy;
  train: string[];
  validation: string[];
  test: string[];
  seed: number;
  ratios: readonly [number, number, number];
  dataHash: string;
  splitHash: string;
  supportByClass: Record<string, Record<SplitName, number>>;
}
export type DataErrorCode =
  | 'SEED'
  | 'OPTIONS'
  | 'SCHEMA'
  | 'LIMIT'
  | 'RATIO'
  | 'TARGET'
  | 'TIMESTAMP'
  | 'NON_FINITE'
  | 'ALL_MISSING'
  | 'DIMENSIONS'
  | 'INTEGRITY'
  | 'PIPELINE'
  | 'CANCELLED'
  | 'INTERNAL';
export class DataError extends Error {
  constructor(
    public readonly code: DataErrorCode,
    public readonly detail = '',
  ) {
    super(code);
    this.name = 'DataError';
  }
}
export const defaultGenerator: Readonly<GeneratorOptions> = {
  recipe: 'clouds',
  count: 300,
  seed: 42,
  noise: 0.08,
  outliers: 0,
  labelNoise: 0,
  missing: 0,
  duplicates: 0,
  minority: 0.5,
};
