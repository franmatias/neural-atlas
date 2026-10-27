import { teachingExample } from '../fixtures/teaching';
import { it, expect, vi } from 'vitest';
import { previewTeachingPack, exportTeachingPack } from '@/application/content/teaching-packs';
import { downloadLearning, readLearning } from '@/infrastructure/files/learning';
import { validateCatalogState, emptyCatalogState } from '@/application/content/catalog';
it('paquete entero valida datos, referencias y soluciones; exportación realmente las omite', () => {
  const p = teachingExample();
  expect(
    previewTeachingPack(exportTeachingPack(p, true)).pack.workshops[0]!.steps.some(
      (s) => s.solution,
    ),
  ).toBe(true);
  expect(exportTeachingPack(p, false)).not.toContain('"solution"');
  expect(previewTeachingPack(exportTeachingPack(p, false)).hash).toHaveLength(64);
  expect(() =>
    previewTeachingPack(JSON.stringify({ ...p, workshops: [p.workshops[0], p.workshops[0]] })),
  ).toThrow('DUPLICATE_ID');
  expect(() =>
    previewTeachingPack(JSON.stringify({ ...p, links: [{ workshopId: 'missing' }] })),
  ).toThrow('MISSING_RELATION');
  expect(() =>
    previewTeachingPack(
      JSON.stringify({ ...p, links: [{ workshopId: p.workshops[0]!.id, presetId: 'missing' }] }),
    ),
  ).toThrow('MISSING_RELATION');
  expect(() =>
    previewTeachingPack(
      JSON.stringify({ ...p, links: [{ workshopId: p.workshops[0]!.id, datasetId: 'missing' }] }),
    ),
  ).toThrow('MISSING_RELATION');
  expect(() =>
    previewTeachingPack(JSON.stringify({ ...p, presets: [{ id: 'bad', experiment: {} }] })),
  ).toThrow();
  expect(() =>
    previewTeachingPack(JSON.stringify({ ...p, datasets: [{ id: 'bad', file: {} }] })),
  ).toThrow();
  expect(() => previewTeachingPack(' '.repeat(64 * 1024 * 1024 + 1))).toThrow('PACK_SIZE');
  expect(() => previewTeachingPack('{"constructor":{}}')).toThrow();
});
it('archivos UTF-8 y descargas revocables no ejecutan contenido', async () => {
  vi.useFakeTimers();
  const create = vi.fn(() => 'blob:learning'),
    revoke = vi.fn();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }));
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  downloadLearning({ safe: '<script>no</script>' }, 'repaso.json');
  expect(click).toHaveBeenCalled();
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledWith('blob:learning');
  expect(
    await readLearning(
      { size: 2, arrayBuffer: async () => new TextEncoder().encode('{}').buffer } as File,
      4,
    ),
  ).toBe('{}');
  await expect(readLearning({ size: 5 * 1024 * 1024 } as File, 4)).rejects.toThrow('supera');
  await expect(
    readLearning({ size: 1, arrayBuffer: async () => new Uint8Array([255]).buffer } as File, 4),
  ).rejects.toThrow();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('catálogo persistido rechaza identidades duplicadas sin reparar silenciosamente', () => {
  expect(validateCatalogState(emptyCatalogState()).packs).toEqual([]);
  expect(() =>
    validateCatalogState({
      ...emptyCatalogState(),
      identityHistory: [
        { id: 'C653', slug: 'a', contentVersion: 1, hash: 'a'.repeat(64) },
        { id: 'C653', slug: 'a', contentVersion: 1, hash: 'a'.repeat(64) },
      ],
    }),
  ).toThrow('DUPLICATE_ID');
});
