import { describe, expect, it, vi } from 'vitest';
import { ExperimentLibrary, libraryLimits } from '@/infrastructure/storage/experiment-library';
import { captureExperiment, exportExperiment } from '@/application/training/experiment';
import { initialSession } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { trainingFixture } from '../fixtures/training';
import { libraryPort } from '../fixtures/library-port';
function snapshot() {
  const f = trainingFixture();
  return captureExperiment(
    f.dataset,
    f.split,
    f.prepared.pipeline.options,
    f.input.pipelineHash,
    f.input.config,
    exhaust(initialSession(f.input)),
    0.5,
    1,
    false,
  );
}
describe('Biblioteca: transacciones y fallos controlados', () => {
  it('guarda tensores nativos, lista, copia, actualiza y elimina con revisión esperada', async () => {
    const port = libraryPort(),
      library = new ExperimentLibrary(() => port.factory);
    expect(await library.list()).toEqual([]);
    const value = snapshot();
    const entry = await library.save(value, '  Prueba  ');
    expect(entry).toMatchObject({ name: 'Prueba', revision: 1, epoch: 0 });
    expect((await library.list())[0]).toEqual(entry);
    const restored = await library.read(entry.id);
    expect(exportExperiment(restored)).toEqual(exportExperiment(value));
    expect(ArrayBuffer.isView(restored.checkpoint.model.layers[0]!.weights)).toBe(true);
    restored.checkpoint.model.layers[0]!.weights[0] = 300;
    expect((await library.read(entry.id)).checkpoint.model.layers[0]!.weights[0]).not.toBe(300);
    expect((await library.save(value, 'Nueva', entry.id, 1)).revision).toBe(2);
    await library.remove(entry.id, 2);
    expect(await library.list()).toEqual([]);
    await expect(library.read(entry.id)).rejects.toMatchObject({ code: 'MISSING' });
    expect(port.close).toHaveBeenCalled();
    port.db.onversionchange?.();
  });
  it('preserva la versión anterior ante conflicto, cuota o corrupción y nunca expulsa entradas', async () => {
    const port = libraryPort(),
      library = new ExperimentLibrary(() => port.factory),
      value = snapshot();
    const entry = await library.save(value, 'Original', 'one');
    await expect(library.save(value, 'Conflict', 'one', 0)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await expect(library.remove('one', 99)).rejects.toMatchObject({ code: 'CONFLICT' });
    port.failWrite(new DOMException('Full', 'QuotaExceededError'));
    await expect(library.save(value, 'Lost', 'one', 1)).rejects.toMatchObject({ code: 'QUOTA' });
    expect((await library.list())[0]).toEqual(entry);
    expect(exportExperiment(await library.read('one'))).toEqual(exportExperiment(value));
    for (let i = 1; i < 5; i++) await library.save(value, `E${i}`);
    await expect(library.save(value, 'Sixth')).rejects.toMatchObject({ code: 'LIMIT' });
    expect(await library.list()).toHaveLength(5);
    await expect(library.save(value, '')).rejects.toMatchObject({ code: 'LIMIT' });
    const old = libraryLimits.perExperiment;
    libraryLimits.perExperiment = 1;
    await expect(library.save(value, 'Big')).rejects.toMatchObject({ code: 'LIMIT' });
    libraryLimits.perExperiment = old;
    port.tables.experiments!.set('broken', { id: 'broken', snapshot: {} });
    await expect(library.read('broken')).rejects.toMatchObject({ code: 'CORRUPT' });
  });
  it('maneja acceso denegado, apertura fallida y bloqueo con éxito tardío sin filtrar conexiones', async () => {
    await expect(
      new ExperimentLibrary(() => {
        throw new DOMException('Denied', 'SecurityError');
      }).list(),
    ).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    const close = vi.fn();
    let request: Record<string, unknown>;
    const factory = {
      open() {
        request = { result: { close }, error: new DOMException('No', 'UnknownError') };
        return request;
      },
    } as unknown as IDBFactory;
    const failed = new ExperimentLibrary(() => factory).list();
    (request!.onerror as () => void)();
    await expect(failed).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    const blocked = new ExperimentLibrary(() => factory).list();
    (request!.onblocked as () => void)();
    await expect(blocked).rejects.toMatchObject({ code: 'BLOCKED' });
    (request!.onsuccess as () => void)();
    expect(close).toHaveBeenCalled();
  });
});
