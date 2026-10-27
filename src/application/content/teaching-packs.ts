import { z } from '@/shared/validation';
import { guardJson, importDatasetJson } from '@/application/data/json-files';
import { importExperiment } from '@/application/training/experiment';
import { definitionSchema, exportWorkshop } from '@/application/workshops/contracts';
import { utf8Length, hashValue } from '@/domain/data/integrity';
const id = z.string().regex(/^[a-zA-Z0-9-]{1,80}$/),
  text = z.string().trim().min(1).max(4000);
export const teachingPackSchema = z.strictObject({
  format: z.literal('neural-atlas.teaching-pack'),
  schemaVersion: z.literal(1),
  packId: id,
  version: z.string().regex(/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/),
  title: z.string().min(1).max(150),
  guide: z.strictObject({
    objectives: z.array(text).min(1).max(20),
    prerequisites: z.array(text).max(20),
    minutes: z.number().int().min(5).max(1440),
    steps: z.array(text).min(1).max(30),
    errors: z.array(text).max(20),
    debate: z.array(text).max(20),
    accessibility: text,
    attribution: text,
  }),
  workshops: z.array(definitionSchema).min(1).max(12),
  datasets: z.array(z.strictObject({ id, file: z.unknown() })).max(100),
  presets: z.array(z.strictObject({ id, experiment: z.unknown() })).max(100),
  links: z
    .array(
      z.strictObject({
        workshopId: z.string().max(40),
        datasetId: id.optional(),
        presetId: id.optional(),
      }),
    )
    .max(100),
});
export type TeachingPack = z.infer<typeof teachingPackSchema>;
export function previewTeachingPack(input: string) {
  if (utf8Length(input) > 64 * 1024 * 1024) throw Error('PACK_SIZE');
  const raw: unknown = JSON.parse(input);
  guardJson(raw);
  const pack = teachingPackSchema.parse(raw);
  for (const entries of [
    pack.workshops.map((w) => w.id),
    pack.datasets.map((d) => d.id),
    pack.presets.map((p) => p.id),
  ])
    if (new Set(entries).size !== entries.length) throw Error('DUPLICATE_ID');
  for (const d of pack.datasets) importDatasetJson(JSON.stringify(d.file));
  for (const p of pack.presets) importExperiment(JSON.stringify(p.experiment));
  for (const link of pack.links) {
    if (
      !pack.workshops.some((w) => w.id === link.workshopId) ||
      (link.datasetId && !pack.datasets.some((d) => d.id === link.datasetId)) ||
      (link.presetId && !pack.presets.some((p) => p.id === link.presetId))
    )
      throw Error('MISSING_RELATION');
  }
  return { pack, hash: hashValue(pack), bytes: utf8Length(JSON.stringify(pack)) + 1024 };
}
export function exportTeachingPack(pack: TeachingPack, solutions: boolean) {
  const next = {
    ...pack,
    workshops: pack.workshops.map((w) => JSON.parse(exportWorkshop(w, solutions)) as typeof w),
  };
  return JSON.stringify(previewTeachingPack(JSON.stringify(next)).pack, null, 2);
}
