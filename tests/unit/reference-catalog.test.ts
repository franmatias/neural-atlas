import { describe, expect, it } from 'vitest';
import catalog from '@/content/catalog/extension-500.json';
import { concepts, searchConcepts } from '@/content/concepts';
import {
  referenceConcepts,
  referenceTopics,
  catalogPlannedCount,
} from '@/content/reference-concepts';
describe('ampliación editorial de 500 conceptos', () => {
  it('conserva 500 IDs nuevos estables y 20 temas sin duplicados', () => {
    const entries = catalog.groups.flatMap((g) => g.entries);
    expect(entries).toHaveLength(500);
    expect(referenceTopics).toHaveLength(20);
    expect(referenceConcepts).toHaveLength(500);
    expect(catalogPlannedCount).toBe(652);
    expect(new Set(entries.map((e) => e.id)).size).toBe(500);
    for (let i = 153; i <= 652; i++) expect(entries.some((e) => e.id === `C${i}`)).toBe(true);
    expect(catalog.groups.every((g) => g.entries.length === 25)).toBe(true);
  });
  it('todas las fichas tienen definiciones propias y traducción identificable', () => {
    const entries = catalog.groups.flatMap((g) => g.entries);
    expect(new Set(entries.map((e) => e.title.toLowerCase())).size).toBe(500);
    expect(new Set(entries.map((e) => e.english.toLowerCase())).size).toBe(500);
    expect(new Set(entries.map((e) => e.definition)).size).toBe(500);
    for (const e of entries) {
      expect(e.definition.length).toBeGreaterThan(60);
      expect(e.english.length).toBeGreaterThan(2);
      expect(e.definition).not.toMatch(/\bTODO\b|pendiente de redactar|definición genérica/);
    }
    expect(new Set(concepts.map((c) => c.id)).size).toBe(concepts.length);
  });
  it('mantiene los 69 interactivos y busca en español, inglés e IDs', () => {
    expect(concepts.filter((c) => !c.reference)).toHaveLength(151);
    expect(concepts).toHaveLength(652);
    expect(searchConcepts('C652')[0]?.title).toBe('Paridad demográfica');
    expect(searchConcepts('key-value cache')[0]?.id).toBe('C512');
    expect(searchConcepts('entropia diferencial')[0]?.english).toBe('Differential entropy');
    expect(searchConcepts('sesgo')[0]?.id).toBe('C028');
    expect(referenceConcepts.every((c) => c.reference && !c.lab && !c.formula && !c.question)).toBe(
      true,
    );
  });
});
