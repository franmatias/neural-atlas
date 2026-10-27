import { z } from '@/shared/validation';
import { concepts, type Concept } from '@/content/concepts';
import { coreRecords } from '@/content/core-records';
import { coreCategories, conceptControls } from '@/content/concept-controls';
import { referenceTopics } from '@/content/reference-concepts';
import { failureCases } from '@/content/failure-cases';
import {
  conceptPackSchema,
  topologicalOrder,
  type CatalogNode,
  type ConceptRecord,
} from '@/domain/content/concept';
import { hashValue } from '@/domain/data/integrity';
import { previewConceptPack, type CatalogContext } from './concept-packs';
export const catalogStateSchema = z.strictObject({
  schemaVersion: z.literal(1),
  packs: z.array(conceptPackSchema),
  identityHistory: z.array(
    z.strictObject({
      id: z.string(),
      slug: z.string(),
      contentVersion: z.number().int().min(1),
      hash: z.string().length(64),
    }),
  ),
});
export type CatalogState = z.infer<typeof catalogStateSchema>;
export const emptyCatalogState = (): CatalogState => ({
  schemaVersion: 1,
  packs: [],
  identityHistory: [],
});
export function validateCatalogState(value: unknown): CatalogState {
  const state = catalogStateSchema.parse(value);
  if (
    new Set(state.packs.map((p) => p.packId)).size !== state.packs.length ||
    new Set(state.identityHistory.map((i) => i.id)).size !== state.identityHistory.length
  )
    throw Error('DUPLICATE_ID');
  const owned = new Set<string>();
  for (const pack of state.packs)
    for (const c of pack.concepts) {
      if (owned.has(c.id)) throw Error('DUPLICATE_OWNER');
      owned.add(c.id);
    }
  const context = buildCatalog(state).context;
  for (const pack of state.packs) {
    if (pack.concepts.some((c) => context.nodes.find((n) => n.id === c.id)?.slug !== c.slug))
      throw Error('CONCEPT_IDENTITY');
    // A newer bundled revision can shadow a local revision. Retain the file for export,
    // validate the active graph, and never reactivate the superseded text silently.
    const active = pack.concepts.filter(
      (c) => context.nodes.find((n) => n.id === c.id)?.owner === pack.packId,
    );
    if (active.length)
      previewConceptPack(JSON.stringify({ ...pack, concepts: active }), {
        ...context,
        packVersions: {},
        packHashes: {},
      });
  }
  return state;
}
export function buildCatalog(state: CatalogState) {
  const records = new Map<string, ConceptRecord>(coreRecords.map((c) => [c.id, c])),
    summaries = new Map(concepts.map((c) => [c.id, c])),
    nodes = new Map<string, CatalogNode>();
  const categories = new Map(
    [...coreCategories, ...referenceTopics.map((g) => ({ id: g.id, title: g.title }))].map((c) => [
      c.id,
      c,
    ]),
  );
  for (const summary of concepts) {
    const record = records.get(summary.id);
    nodes.set(
      summary.id,
      record
        ? {
            id: record.id,
            slug: record.slug,
            contentVersion: record.contentVersion,
            prerequisiteIds: record.prerequisiteIds,
            relatedIds: record.relatedIds,
            ...(record.redirect ? { redirect: record.redirect } : {}),
            hash: hashValue(record),
          }
        : {
            id: summary.id,
            slug: 'reference-' + summary.id.toLowerCase(),
            contentVersion: 1,
            prerequisiteIds: [],
            relatedIds: [],
            hash: hashValue(summary),
          },
    );
  }
  for (const pack of state.packs) {
    for (const category of pack.categories)
      if (!categories.has(category.id)) categories.set(category.id, category);
    for (const c of pack.concepts) {
      const old = nodes.get(c.id);
      if (old && c.contentVersion <= old.contentVersion) continue;
      records.set(c.id, c);
      nodes.set(c.id, {
        id: c.id,
        slug: c.slug,
        contentVersion: c.contentVersion,
        prerequisiteIds: c.prerequisiteIds,
        relatedIds: c.relatedIds,
        ...(c.redirect ? { redirect: c.redirect } : {}),
        owner: pack.packId,
        hash: hashValue(c),
      });
      const control = c.relatedControls[0],
        path = conceptControls.find(
          (r) => r.labId === control?.labId && r.controlId === control?.controlId,
        )?.path;
      const summary: Concept = {
        id: c.id,
        title: c.title.es,
        english: c.title.en,
        aliases: [...c.aliases.es, ...c.aliases.en],
        definition: c.definition.es,
        formula: c.formal.notation,
        question: c.selfAssessment.prompt,
        answer: c.selfAssessment.answer,
        reference: !['implemented', 'reviewed'].includes(c.status),
        topic: c.category,
        ...(path ? { lab: path.slice(5) } : {}),
      };
      summaries.set(c.id, summary);
    }
  }
  const order = topologicalOrder([...nodes.values()]);
  const context: CatalogContext = {
    nodes: [...nodes.values()],
    categories: [...categories.keys()],
    controls: conceptControls.map((c) => c.labId + '/' + c.controlId),
    presets: failureCases.map((c) => c.presetId),
    packVersions: Object.fromEntries(state.packs.map((p) => [p.packId, p.version])),
    packHashes: Object.fromEntries(state.packs.map((p) => [p.packId, hashValue(p)])),
    owners: Object.fromEntries(state.packs.flatMap((p) => p.concepts.map((c) => [c.id, p.packId]))),
    identityHistory: state.identityHistory,
  };
  return {
    records,
    summaries: [...summaries.values()],
    nodes: [...nodes.values()],
    categories: [...categories.values()],
    order,
    context,
  };
}
