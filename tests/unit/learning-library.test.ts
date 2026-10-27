import { it, expect } from 'vitest';
import { LearningLibrary } from '@/infrastructure/storage/learning-library';
import { libraryPort } from '../fixtures/library-port';
it('guarda tras complete, detecta revisión concurrente, corrupción y eliminación específica', async () => {
  const port = libraryPort(),
    library = new LearningLibrary(() => port.factory);
  const first = await library.save('contentCatalog', 'active', { concepts: ['C653'] }, 0);
  expect(first.revision).toBe(1);
  expect((await library.list('contentCatalog'))[0]!.value).toEqual({ concepts: ['C653'] });
  await expect(library.save('contentCatalog', 'active', {}, 0)).rejects.toMatchObject({
    code: 'CONFLICT',
  });
  await expect(library.remove('contentCatalog', 'active', 0)).rejects.toMatchObject({
    code: 'CONFLICT',
  });
  (port.tables.contentCatalog!.get('active') as { integrity: string }).integrity = 'tampered';
  await expect(library.list('contentCatalog')).rejects.toMatchObject({ code: 'CORRUPT' });
  await library.remove('contentCatalog', 'active', 1);
  expect(await library.list('contentCatalog')).toEqual([]);
  expect(port.close).toHaveBeenCalled();
});
it('presupuestos compartidos, aborto por cuota y último registro conservado', async () => {
  const port = libraryPort(),
    library = new LearningLibrary(() => port.factory);
  await library.save('learningReview', 'C021', { box: 1 }, 0);
  port.failWrite(new DOMException('Full', 'QuotaExceededError'));
  await expect(library.save('learningReview', 'C021', { box: 2 }, 1)).rejects.toMatchObject({
    code: 'QUOTA',
  });
  expect((await library.list<{ box: number }>('learningReview'))[0]!.value.box).toBe(1);
  port.tables.learningEvidence!.set('large', { id: 'large', bytes: 8 * 1024 * 1024 });
  await expect(library.save('learningReview', 'C022', { box: 1 }, 0)).rejects.toMatchObject({
    code: 'LIMIT',
  });
  port.tables.teachingPacks!.set('large', { id: 'large', bytes: 16 * 1024 * 1024 });
  await expect(library.save('contentCatalog', 'active', {}, 0)).rejects.toMatchObject({
    code: 'LIMIT',
  });
  await expect(
    library.save('contentCatalog', 'active', { text: 'x'.repeat(16 * 1024 * 1024) }, 0),
  ).rejects.toMatchObject({ code: 'LIMIT' });
  await expect(library.save('contentCatalog', 'active', {}, -1)).rejects.toMatchObject({
    code: 'CORRUPT',
  });
});
