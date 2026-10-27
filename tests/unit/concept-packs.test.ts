import { it, expect } from 'vitest';
import fixture from '../../docs/fixtures/concept-example.json';
import {
  conceptSchema,
  assessmentSchema,
  topologicalOrder,
  assessAnswer,
  type CatalogNode,
} from '@/domain/content/concept';
import {
  previewConceptPack,
  exportConceptPack,
  newerVersion,
  type CatalogContext,
} from '@/application/content/concept-packs';
import { hashValue } from '@/domain/data/integrity';
const concept = conceptSchema.parse(fixture);
const node = (id: string, prerequisiteIds: string[] = []): CatalogNode => ({
  id,
  slug: id.toLowerCase(),
  contentVersion: 1,
  prerequisiteIds,
  relatedIds: [],
});
const context = (): CatalogContext => ({
  nodes: ['C011', 'C027', 'C028', 'C049'].map((id) => node(id)),
  categories: ['architecture'],
  controls: ['L02/input-x1', 'L02/bias'],
  presets: ['failure-zero'],
  packVersions: {},
});
const pack = () => ({
  format: 'neural-atlas.concept-pack' as const,
  schemaVersion: 1 as const,
  packId: 'teacher-concepts',
  version: '1.0.0',
  title: 'Conceptos del aula',
  categories: [],
  concepts: [structuredClone(concept)],
});
it('verdadero/falso exige una sola respuesta correcta y mantiene MCQ multirrespuesta', () => {
  const q = { ...concept.selfAssessment, type: 'true-false' as const };
  expect(assessmentSchema.parse(q).correctOptionIds).toHaveLength(1);
  expect(
    assessmentSchema.safeParse({ ...q, correctOptionIds: q.options.map((o) => o.id) }).success,
  ).toBe(false);
  expect(
    assessmentSchema.parse({ ...q, type: 'mcq', correctOptionIds: q.options.map((o) => o.id) })
      .correctOptionIds,
  ).toHaveLength(2);
});
it('el contrato editorial acepta el ejemplo acordado y distingue opciones de respuestas', () => {
  expect(concept.id).toBe('C021');
  expect(concept.numericExample.z).toBe(0.44);
  expect(assessAnswer(concept.selfAssessment, ['a'])).toBe(true);
  expect(assessAnswer(concept.selfAssessment, ['b'])).toBe(false);
  expect(assessAnswer(concept.selfAssessment, ['a', 'a'])).toBe(false);
  const p = pack();
  expect(previewConceptPack(exportConceptPack(p), context()).changes).toEqual([
    { id: 'C021', kind: 'new', to: 1 },
  ]);
  expect(() =>
    conceptSchema.parse({ ...concept, definition: { es: 'Demasiado breve' } }),
  ).toThrow();
  expect(() => conceptSchema.parse({ ...concept, status: 'deprecated' })).toThrow();
  expect(() =>
    conceptSchema.parse({
      ...concept,
      sources: [{ title: 'Peligro', url: 'javascript:alert(1)' }],
    }),
  ).toThrow();
  expect(() =>
    conceptSchema.parse({
      ...concept,
      sources: [{ title: 'Peligro', url: 'https://user:secret@example.com/' }],
    }),
  ).toThrow();
  expect(() =>
    conceptSchema.parse({
      ...concept,
      selfAssessment: { ...concept.selfAssessment, correctOptionIds: ['inexistente'] },
    }),
  ).toThrow();
  expect(() =>
    conceptSchema.parse({ ...concept, status: 'implemented', relatedControls: [] }),
  ).toThrow();
});
it('DAG iterativo, referencias, relaciones recíprocas y redirecciones', () => {
  expect(topologicalOrder([node('C002', ['C001']), node('C001')])).toEqual(['C001', 'C002']);
  expect(() => topologicalOrder([node('C001', ['C002']), node('C002', ['C001'])])).toThrow(
    'PREREQUISITE_CYCLE',
  );
  expect(() => topologicalOrder([node('C001', ['C001'])])).toThrow('MISSING_RELATION');
  expect(() => topologicalOrder([node('C001'), node('C001')])).toThrow('DUPLICATE_ID');
  expect(() => topologicalOrder([node('C001', ['C002'])])).toThrow('MISSING_RELATION');
  expect(() => topologicalOrder([node('C001'), node('C002', ['C001', 'C001'])])).toThrow(
    'DUPLICATE_RELATION',
  );
  expect(
    topologicalOrder([
      { ...node('C001'), relatedIds: ['C002'] },
      { ...node('C002'), relatedIds: ['C001'] },
    ]),
  ).toHaveLength(2);
  expect(() =>
    topologicalOrder([
      { ...node('C001'), redirect: 'C002' },
      { ...node('C002'), redirect: 'C001' },
    ]),
  ).toThrow('REDIRECT_CYCLE');
  expect(topologicalOrder([{ ...node('C001'), redirect: 'C002' }, node('C002')])).toHaveLength(2);
});
it('previsualiza altas y cambios, evita apropiación y versiones regresivas', () => {
  const c = context(),
    p = pack(),
    old = { ...node('C021'), slug: concept.slug, hash: hashValue(concept), owner: p.packId };
  c.nodes.push(old);
  c.packVersions[p.packId] = '1.0.0';
  c.packHashes = { [p.packId]: hashValue(p) };
  expect(previewConceptPack(JSON.stringify(p), c).unchanged).toBe(true);
  p.version = '1.1.0';
  expect(previewConceptPack(JSON.stringify(p), c).changes).toEqual([]);
  p.concepts[0]!.contentVersion = 2;
  expect(previewConceptPack(JSON.stringify(p), c).changes[0]).toEqual({
    id: 'C021',
    kind: 'update',
    from: 1,
    to: 2,
  });
  old.owner = 'another-pack';
  expect(() => previewConceptPack(JSON.stringify(p), c)).toThrow('CONCEPT_IDENTITY');
  old.owner = p.packId;
  old.slug = 'different';
  expect(() => previewConceptPack(JSON.stringify(p), c)).toThrow('CONCEPT_IDENTITY');
  old.slug = concept.slug;
  p.concepts[0]!.contentVersion = 1;
  p.concepts[0]!.title.es = 'Título cambiado sin versión';
  expect(() => previewConceptPack(JSON.stringify(p), c)).toThrow('CONCEPT_VERSION');
  p.version = '0.9.0';
  expect(() => previewConceptPack(JSON.stringify(p), c)).toThrow('PACK_VERSION');
  expect(newerVersion('1.2.0', '1.1.9')).toBe(true);
  expect(newerVersion('1.0.0', '2.0.0')).toBe(false);
  expect(newerVersion('1.0.0', '1.0.0')).toBe(false);
});
it('rechaza límites simultáneos, claves peligrosas, controles y referencias no registrados', () => {
  const c = context();
  expect(() => previewConceptPack(' '.repeat(4 * 1024 * 1024 + 1), c)).toThrow('PACK_SIZE');
  expect(() => previewConceptPack('{"__proto__":{}}', c)).toThrow();
  const change = (patch: Record<string, unknown>) =>
    JSON.stringify({ ...pack(), concepts: [{ ...concept, ...patch }] });
  expect(() => previewConceptPack(change({ category: 'absent' }), c)).toThrow('UNKNOWN_CATEGORY');
  expect(() =>
    previewConceptPack(change({ relatedControls: [{ labId: 'L02', controlId: 'unknown' }] }), c),
  ).toThrow('UNKNOWN_CONTROL');
  expect(() => previewConceptPack(change({ misconceptionPresetIds: ['missing'] }), c)).toThrow(
    'UNKNOWN_PRESET',
  );
  expect(() => previewConceptPack(change({ prerequisiteIds: ['C999'] }), c)).toThrow(
    'MISSING_RELATION',
  );
  expect(() =>
    previewConceptPack(JSON.stringify({ ...pack(), concepts: [concept, concept] }), c),
  ).toThrow('DUPLICATE_ID');
  expect(() =>
    previewConceptPack(JSON.stringify({ ...pack(), concepts: Array(501).fill(concept) }), c),
  ).toThrow();
  expect(() =>
    previewConceptPack(
      JSON.stringify({
        ...pack(),
        categories: [
          { id: 'new', title: 'A' },
          { id: 'new', title: 'B' },
        ],
      }),
      c,
    ),
  ).toThrow('DUPLICATE_CATEGORY');
  c.nodes.push({ ...node('C888'), slug: concept.slug });
  expect(() => previewConceptPack(JSON.stringify(pack()), c)).toThrow('DUPLICATE_SLUG');
});
it('restaurar un ID retirado conserva su identidad y no permite eliminar IDs por actualizar', () => {
  const c = context(),
    p = pack();
  c.identityHistory = [
    { id: concept.id, slug: concept.slug, contentVersion: 1, hash: hashValue(concept) },
  ];
  expect(previewConceptPack(JSON.stringify(p), c).changes[0]!.kind).toBe('new');
  p.concepts[0]!.slug = 'new-identity';
  expect(() => previewConceptPack(JSON.stringify(p), c)).toThrow('CONCEPT_IDENTITY');
  c.identityHistory = [];
  p.concepts[0]!.slug = concept.slug;
  c.nodes.push({ ...node('C999'), owner: p.packId });
  expect(() => previewConceptPack(JSON.stringify(p), c)).toThrow('PACK_REMOVES_IDS');
});
