import { z } from '@/shared/validation';
import { recipeIds } from '@/domain/data/types';
import { safeId } from '@/domain/data/validation';
const text = z.string().max(4096);
const id = z.string().refine(safeId);
const cell = z.union([z.number(), text, z.null()]);
const list = <T extends z.ZodType>(value: T) => z.array(value).max(10000);
const seed = z.number().int().min(0).max(0xffffffff);
export const generatorSchema = z.strictObject({
  recipe: z.enum(recipeIds),
  count: z.number().int().min(20).max(10000),
  seed,
  noise: z.number().min(0).max(1),
  outliers: z.number().min(0).max(0.2),
  labelNoise: z.number().min(0).max(0.3),
  missing: z.number().min(0).max(0.3),
  duplicates: z.number().min(0).max(0.2),
  minority: z.number().min(0.05).max(0.5),
});
const feature = z.strictObject({
  id,
  name: text.min(1),
  kind: z.enum(['numeric', 'categorical']),
  unit: text.optional(),
});
const annotation = z.strictObject({
  defects: z.array(z.enum(['noise', 'outlier', 'label', 'missing', 'duplicate'])).max(5),
  cleanTarget: z.union([z.number(), text]),
  sourceId: id.optional(),
});
const split = z.strictObject({
  fold: z
    .strictObject({
      kind: z.literal('k-fold-v1'),
      count: z.number().int().min(2).max(10),
      index: z.number().int().min(0).max(9),
      seed,
      strategy: z.enum(['random', 'stratified', 'grouped']),
    })
    .optional(),
  selection: z
    .strictObject({
      kind: z.literal('balanced-prefix-v1'),
      count: z.number().int().min(4).max(10000),
      seed,
    })
    .optional(),
  strategy: z.enum(['random', 'stratified', 'grouped', 'stratified-grouped', 'temporal']),
  train: list(id),
  validation: list(id),
  test: list(id),
  seed,
  ratios: z.tuple([z.number(), z.number(), z.number()]),
  dataHash: z.string().regex(/^[a-f0-9]{64}$/),
  splitHash: z.string().regex(/^[a-f0-9]{64}$/),
  supportByClass: z.record(
    text,
    z.strictObject({
      train: z.number().int().nonnegative(),
      validation: z.number().int().nonnegative(),
      test: z.number().int().nonnegative(),
    }),
  ),
});
export const datasetFileSchema = z
  .strictObject({
    format: z.literal('neural-atlas.dataset'),
    schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    dataHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    provenance: z.strictObject({
      appVersion: z.string().max(100),
      synthetic: z.boolean(),
      recipeExact: z.boolean(),
    }),
    dataset: z.strictObject({
      id,
      revision: z.number().int().positive(),
      task: z.enum(['binary', 'multiclass', 'regression']),
      features: z.array(feature).min(1).max(63),
      targetName: text.min(1),
      rowIds: list(id),
      targets: list(cell),
      columns: z.record(id, list(cell)),
      origins: list(z.enum(['generated', 'imported', 'manual', 'augmented'])),
      groupIds: list(id.nullable()).optional(),
      timestamps: list(text.nullable()).optional(),
      annotations: list(annotation.nullable()).optional(),
      classOrder: z.array(text.min(1)).min(2).max(10).optional(),
      recipe: z
        .strictObject({
          id: z.enum(recipeIds),
          version: z.literal(1),
          seed,
          options: generatorSchema,
        })
        .optional(),
    }),
    split: split.optional(),
  })
  .refine(
    (file) => file.schemaVersion === (file.split?.fold ? 3 : file.split?.selection ? 2 : 1),
    'DATASET_VERSION',
  );
