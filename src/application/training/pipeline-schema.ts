import { z } from '@/shared/validation';
import { safeId } from '@/domain/data/validation';
const finite = z.number().finite(),
  id = z.string().refine(safeId),
  text = z.string().max(4096),
  hash = z.string().regex(/^[a-f0-9]{64}$/);
export const derivedSchema = z.strictObject({
  id,
  operation: z.enum(['square', 'product', 'log1p']),
  sources: z.array(id).min(1).max(2),
});
export const optionsSchema = z.strictObject({
  featureIds: z.array(id).min(1).max(32),
  imputation: z.enum(['mean', 'median', 'mode']),
  scaling: z.enum(['none', 'minmax', 'standard', 'robust']),
  missingIndicators: z.boolean(),
  derived: z.array(derivedSchema).min(1).max(8).optional(),
});
const numericSchema = z.strictObject({
  kind: z.literal('numeric'),
  id,
  fill: finite,
  mean: finite,
  std: finite.min(0),
  min: finite,
  max: finite,
  constant: z.boolean(),
  robust: z.strictObject({ median: finite, q1: finite, q3: finite, iqr: finite.min(0) }).optional(),
});
export const pipelineSchema = z.strictObject({
  version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  inputFeatureIds: z.array(id).min(1).max(32),
  outputFeatureIds: z.array(text).min(1).max(32),
  outputLabels: z.array(text).min(1).max(32),
  fittedOn: z.strictObject({ split: z.literal('train'), idsHash: hash }),
  dataHash: hash,
  splitHash: hash,
  options: optionsSchema,
  columns: z
    .array(
      z.discriminatedUnion('kind', [
        numericSchema,
        z.strictObject({
          kind: z.literal('categorical'),
          id,
          fill: text,
          vocabulary: z.array(text).min(1).max(32),
        }),
      ]),
    )
    .min(1)
    .max(32),
  derived: z.array(numericSchema).min(1).max(8).optional(),
});
