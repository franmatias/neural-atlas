import { it, expect } from 'vitest';
import extra from '@/content/catalog/extension-ai-100.json';
import { concepts, searchConcepts } from '@/content/concepts';
import { referenceTopics } from '@/content/reference-concepts';
import {
  buildCatalog,
  validateCatalogState,
  emptyCatalogState,
} from '@/application/content/catalog';
import { coreRecords } from '@/content/core-records';
import { hashValue } from '@/domain/data/integrity';
import { previewConceptPack } from '@/application/content/concept-packs';
const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
it('exactamente cien conceptos adicionales con identidad, traducción y definición únicas', () => {
  const entries = extra.groups.flatMap((g) => g.entries),
    ids = new Set(entries.map((e) => e.id));
  expect(entries).toHaveLength(100);
  expect(extra.groups).toHaveLength(10);
  expect(referenceTopics).toHaveLength(30);
  expect(concepts).toHaveLength(752);
  expect(new Set(concepts.map((c) => c.id)).size).toBe(752);
  const old = concepts.filter((c) => !ids.has(c.id)),
    known = new Map<string, string>();
  for (const c of old)
    for (const term of [c.title, c.english, ...(c.aliases ?? [])]) known.set(normalize(term), c.id);
  for (const e of entries) {
    expect(e.definition.length).toBeGreaterThan(100);
    for (const term of [e.title, e.english, ...e.aliases]) {
      const key = normalize(term);
      expect(known.get(key), `${e.id}: ${term}`).toBeUndefined();
    }
    for (const term of [e.title, e.english, ...e.aliases]) known.set(normalize(term), e.id);
    expect(searchConcepts(e.id)[0]?.id).toBe(e.id);
    expect(searchConcepts(e.english)[0]?.id).toBe(e.id);
    expect(e.definition).not.toMatch(/TODO|pendiente de redactar/);
  }
  for (let i = 1001; i <= 1100; i++) expect(ids.has('C' + i)).toBe(true);
  expect(searchConcepts('RAG')[0]?.id).toBe('C1071');
  expect(searchConcepts('DPO')[0]?.id).toBe('C1092');
});
it('una referencia nueva no borra una identidad local ya guardada; una importación nueva no la suplanta', () => {
  const c = {
    ...structuredClone(coreRecords[20]!),
    id: 'C1001',
    slug: 'mi-concepto-anterior',
    prerequisiteIds: [],
    relatedIds: [],
  };
  const pack = {
    format: 'neural-atlas.concept-pack' as const,
    schemaVersion: 1 as const,
    packId: 'prior-local',
    version: '1.0.0',
    title: 'Paquete anterior',
    categories: [],
    concepts: [c],
  };
  const state = {
    ...emptyCatalogState(),
    packs: [pack],
    identityHistory: [
      { id: c.id, slug: c.slug, contentVersion: c.contentVersion, hash: hashValue(c) },
    ],
  };
  expect(validateCatalogState(state)).toEqual(state);
  const registry = buildCatalog(state);
  expect(registry.records.get('C1001')?.slug).toBe('mi-concepto-anterior');
  expect(registry.nodes.find((n) => n.id === 'C1001')?.owner).toBe('prior-local');
  expect(() =>
    previewConceptPack(JSON.stringify(pack), buildCatalog(emptyCatalogState()).context),
  ).toThrow('CONCEPT_IDENTITY');
});
