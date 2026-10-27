import {
  conceptPackSchema,
  topologicalOrder,
  type CatalogNode,
  type ConceptPack,
} from '@/domain/content/concept';
import { guardJson } from '@/application/data/json-files';
import { hashValue, utf8Length } from '@/domain/data/integrity';
export interface CatalogContext {
  nodes: CatalogNode[];
  categories: string[];
  controls: string[];
  presets: string[];
  packVersions: Record<string, string>;
  packHashes?: Record<string, string>;
  identityHistory?: { id: string; slug: string; contentVersion: number; hash: string }[];
}
export function newerVersion(a: string, b: string) {
  const x = a.split('.').map(Number),
    y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i]! > y[i]!;
  }
  return false;
}
export function previewConceptPack(text: string, context: CatalogContext) {
  if (utf8Length(text) > 4 * 1024 * 1024) throw Error('PACK_SIZE');
  const raw: unknown = JSON.parse(text);
  guardJson(raw);
  const pack = conceptPackSchema.parse(raw),
    previous = context.packVersions[pack.packId];
  const hash = hashValue(pack);
  if (previous === pack.version && context.packHashes?.[pack.packId] === hash)
    return { pack, changes: [], hash, unchanged: true };
  if (previous && !newerVersion(pack.version, previous)) throw Error('PACK_VERSION');
  const categories = new Set([...context.categories, ...pack.categories.map((c) => c.id)]);
  if (new Set(pack.categories.map((c) => c.id)).size !== pack.categories.length)
    throw Error('DUPLICATE_CATEGORY');
  const lookup = new Map(context.nodes.map((n) => [n.id, n])),
    seen = new Set<string>(),
    changes: { id: string; kind: 'new' | 'update'; from?: number; to: number }[] = [];
  for (const c of pack.concepts) {
    if (utf8Length(JSON.stringify(c)) > 32 * 1024) throw Error('CONCEPT_SIZE');
    if (seen.has(c.id)) throw Error('DUPLICATE_ID');
    seen.add(c.id);
    if (!categories.has(c.category)) throw Error('UNKNOWN_CATEGORY');
    if (
      c.relatedControls.some((r) => !context.controls.includes(`${r.labId}/${r.controlId}`)) ||
      c.labIds.some((id) => !context.controls.some((key) => key.startsWith(id + '/')))
    )
      throw Error('UNKNOWN_CONTROL');
    if (c.misconceptionPresetIds.some((id) => !context.presets.includes(id)))
      throw Error('UNKNOWN_PRESET');
    const old = lookup.get(c.id);
    if (old && (old.slug !== c.slug || (old.owner && old.owner !== pack.packId)))
      throw Error('CONCEPT_IDENTITY');
    if (old && c.contentVersion === old.contentVersion && old.hash === hashValue(c)) continue;
    if (old && c.contentVersion <= old.contentVersion) throw Error('CONCEPT_VERSION');
    const historical = context.identityHistory?.find((n) => n.id === c.id);
    if (
      !old &&
      historical &&
      (historical.slug !== c.slug ||
        c.contentVersion < historical.contentVersion ||
        (c.contentVersion === historical.contentVersion && hashValue(c) !== historical.hash))
    )
      throw Error('CONCEPT_IDENTITY');
    changes.push({
      id: c.id,
      kind: old ? 'update' : 'new',
      ...(old ? { from: old.contentVersion } : {}),
      to: c.contentVersion,
    });
    lookup.set(c.id, {
      id: c.id,
      slug: c.slug,
      contentVersion: c.contentVersion,
      prerequisiteIds: c.prerequisiteIds,
      relatedIds: c.relatedIds,
      ...(c.redirect ? { redirect: c.redirect } : {}),
      owner: pack.packId,
      hash: hashValue(c),
    });
  }
  const nodes = [...lookup.values()];
  if (new Set(nodes.map((n) => n.slug)).size !== nodes.length) throw Error('DUPLICATE_SLUG');
  topologicalOrder(nodes);
  // Replacing a package cannot silently remove IDs on which others depend.
  const oldIds = context.nodes.filter((n) => n.owner === pack.packId).map((n) => n.id);
  if (oldIds.some((id) => !seen.has(id))) throw Error('PACK_REMOVES_IDS');
  return { pack, changes, hash, unchanged: false };
}
export function exportConceptPack(pack: ConceptPack) {
  return JSON.stringify(conceptPackSchema.parse(pack), null, 2);
}
