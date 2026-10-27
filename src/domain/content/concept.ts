import { z } from '@/shared/validation';
export const conceptIdSchema = z
  .string()
  .max(40)
  .regex(/^C\d{3,}$/);
const text = z.string().trim().min(1).max(2000),
  short = z.string().trim().min(1).max(150);
export const localizedSchema = z.strictObject({
  es: text,
  en: text.optional(),
  ca: text.optional(),
  gl: text.optional(),
  eu: text.optional(),
});
const title = z.strictObject({
  es: short,
  en: short,
  ca: short.optional(),
  gl: short.optional(),
  eu: short.optional(),
});
const aliases = z.strictObject({
  es: z.array(short).max(30),
  en: z.array(short).max(30),
  ca: z.array(short).max(30).optional(),
  gl: z.array(short).max(30).optional(),
  eu: z.array(short).max(30).optional(),
});
const option = z.strictObject({
  id: z
    .string()
    .max(40)
    .regex(/^[a-z0-9-]+$/),
  text: z.string().min(1).max(1000),
});
export const assessmentSchema = z
  .strictObject({
    id: z.string().max(80).optional(),
    type: z.enum(['mcq', 'true-false']),
    prompt: text,
    options: z.array(option).min(2).max(6),
    correctOptionIds: z.array(z.string().max(40)).min(1).max(6),
    answer: text,
    explanation: text,
  })
  .refine(
    (q) =>
      new Set(q.options.map((o) => o.id)).size === q.options.length &&
      new Set(q.correctOptionIds).size === q.correctOptionIds.length &&
      q.correctOptionIds.every((id) => q.options.some((o) => o.id === id)) &&
      (q.type !== 'true-false' || q.options.length === 2),
    'QUESTION_OPTIONS',
  );
const docPaths = [
  '../10-motor-matematico.md',
  '../06-matriz-conceptos.md',
  '../05-laboratorios.md',
  '../22-experiencias-educativas.md',
] as const;
const https = z
  .string()
  .max(1000)
  .refine((value) => {
    try {
      const url = new globalThis.URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'HTTPS_SOURCE');
export const conceptSchema = z
  .strictObject({
    id: conceptIdSchema,
    slug: z
      .string()
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    contentVersion: z.number().int().min(1).max(1_000_000),
    title,
    aliases,
    category: z
      .string()
      .max(60)
      .regex(/^[a-z][a-z0-9-]*$/),
    level: z.enum(['introductory', 'intermediate', 'advanced']),
    definition: localizedSchema.refine((d) => {
      const n = d.es.split(/\s+/).length;
      return n >= 40 && n <= 80;
    }, 'DEFINITION_40_80_WORDS'),
    intuition: localizedSchema.extend({ analogyLimit: text }),
    formal: z.strictObject({ notation: text, dimensions: text }),
    numericExample: z.strictObject({
      inputs: z.array(z.number().finite()).max(32).optional(),
      weights: z.array(z.number().finite()).max(32).optional(),
      bias: z.number().finite().optional(),
      z: z.number().finite().optional(),
      output: z.number().finite().optional(),
      values: z
        .record(z.string().max(60), z.union([z.number().finite(), z.string().max(500)]))
        .refine((v) => Object.keys(v).length <= 32)
        .optional(),
      calculation: text.optional(),
      result: text.optional(),
      units: short,
      snapshotBindings: z
        .array(z.enum(['selectedNeuron.preActivation', 'selectedNeuron.activation']))
        .max(2),
    }),
    relatedControls: z
      .array(
        z.strictObject({
          labId: z.string().regex(/^L\d{2}$/),
          controlId: z
            .string()
            .max(80)
            .regex(/^[a-z0-9-]+$/),
        }),
      )
      .max(12),
    frequentMistake: localizedSchema.extend({ correction: text }),
    misconceptionPresetIds: z.array(z.string().max(80)).max(8),
    selfAssessment: assessmentSchema,
    prerequisiteIds: z.array(conceptIdSchema).max(32),
    relatedIds: z.array(conceptIdSchema).max(32),
    labIds: z.array(z.string().regex(/^L\d{2}$/)).max(14),
    activity: text,
    evidence: text,
    validationRefs: z.array(z.string().max(100)).max(20),
    sources: z
      .array(
        z.union([
          z.strictObject({ title: short, url: https }),
          z.strictObject({ title: short, path: z.enum(docPaths) }),
        ]),
      )
      .min(1)
      .max(10),
    targetRelease: z
      .string()
      .max(20)
      .regex(/^\d+\.\d+(?:\.\d+)?$/),
    status: z.enum(['proposed', 'specified', 'implemented', 'reviewed', 'deprecated']),
    redirect: conceptIdSchema.optional(),
  })
  .refine((c) => c.status !== 'deprecated' || !!c.redirect, 'DEPRECATED_REDIRECT')
  .refine(
    (c) =>
      !['implemented', 'reviewed'].includes(c.status) ||
      (c.labIds.length > 0 && c.relatedControls.length > 0 && c.validationRefs.length > 0),
    'IMPLEMENTATION_EVIDENCE',
  )
  .refine(
    (c) => !c.numericExample.snapshotBindings.length || c.labIds.includes('L02'),
    'SNAPSHOT_BINDING_LAB',
  );
export type ConceptRecord = z.infer<typeof conceptSchema>;
export const categorySchema = z.strictObject({
  id: z
    .string()
    .max(60)
    .regex(/^[a-z][a-z0-9-]*$/),
  title: short,
});
export const conceptPackSchema = z.strictObject({
  format: z.literal('neural-atlas.concept-pack'),
  schemaVersion: z.literal(1),
  packId: z
    .string()
    .max(80)
    .regex(/^[a-zA-Z0-9-]+$/),
  version: z
    .string()
    .regex(/^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/)
    .max(30),
  title: short,
  categories: z.array(categorySchema).max(100),
  concepts: z.array(conceptSchema).min(1).max(500),
});
export type ConceptPack = z.infer<typeof conceptPackSchema>;
export interface CatalogNode {
  id: string;
  slug: string;
  contentVersion: number;
  prerequisiteIds: string[];
  relatedIds: string[];
  redirect?: string;
  owner?: string;
  hash?: string;
}
export function topologicalOrder(nodes: readonly CatalogNode[]): string[] {
  const lookup = new Map(nodes.map((n) => [n.id, n]));
  if (lookup.size !== nodes.length) throw Error('DUPLICATE_ID');
  const incoming = new Map<string, number>(),
    children = new Map<string, string[]>();
  for (const node of nodes) {
    if (
      new Set(node.prerequisiteIds).size !== node.prerequisiteIds.length ||
      new Set(node.relatedIds).size !== node.relatedIds.length
    )
      throw Error('DUPLICATE_RELATION');
    incoming.set(node.id, node.prerequisiteIds.length);
    for (const id of [
      ...node.prerequisiteIds,
      ...node.relatedIds,
      ...(node.redirect ? [node.redirect] : []),
    ])
      if (id === node.id || !lookup.has(id)) throw Error('MISSING_RELATION');
    for (const id of node.prerequisiteIds) children.set(id, [...(children.get(id) ?? []), node.id]);
  }
  const queue = nodes
    .filter((n) => !incoming.get(n.id))
    .map((n) => n.id)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const result: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]!;
    result.push(id);
    for (const child of children.get(id) ?? []) {
      incoming.set(child, incoming.get(child)! - 1);
      if (incoming.get(child) === 0) queue.push(child);
    }
  }
  if (result.length !== nodes.length) throw Error('PREREQUISITE_CYCLE');
  // Redirects have a separate cycle rule; related links may be reciprocal.
  for (const node of nodes) {
    const seen = new Set<string>();
    let current: CatalogNode | undefined = node;
    while (current?.redirect) {
      if (seen.has(current.id)) throw Error('REDIRECT_CYCLE');
      seen.add(current.id);
      current = lookup.get(current.redirect);
    }
  }
  return result;
}
export function assessAnswer(question: z.infer<typeof assessmentSchema>, selected: string[]) {
  return (
    selected.length === question.correctOptionIds.length &&
    new Set(selected).size === selected.length &&
    selected.every((id) => question.correctOptionIds.includes(id))
  );
}
