import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataClient, type WorkerPort } from '@/infrastructure/workers/data-client';
import { readDatasetFile, downloadDataset } from '@/infrastructure/files/download';
import { defaultGenerator } from '@/domain/data/types';
import { handleDataJob } from '@/application/data/jobs';
import { formatData } from '@/shared/utils/data-format';
afterEach(() => vi.useRealTimers());
function port(): WorkerPort {
  return { onmessage: null, onerror: null, postMessage: vi.fn(), terminate: vi.fn() };
}
describe('cliente de Worker y errores de ciclo de vida', () => {
  it('resuelve solo el ID activo y termina el Worker', async () => {
    const worker = port();
    const client = new DataClient(() => worker);
    const result = client.run('generate', { ...defaultGenerator, count: 20 });
    worker.onmessage!({ data: { id: 99, ok: false, code: 'SEED', detail: '' } } as MessageEvent);
    const sent = vi.mocked(worker.postMessage).mock.calls[0]![0];
    worker.onmessage!({ data: handleDataJob(sent.id, sent.job) } as MessageEvent);
    expect((await result).rows).toHaveLength(20);
    expect(worker.terminate).toHaveBeenCalled();
    client.cancel();
  });
  it('rechaza mensajes de error, fallo del Worker y del constructor', async () => {
    const worker = port();
    const client = new DataClient(() => worker);
    let result = client.run('generate', { ...defaultGenerator });
    worker.onmessage!({ data: { id: 1, ok: false, code: 'LIMIT', detail: 'CSV' } } as MessageEvent);
    await expect(result).rejects.toMatchObject({ code: 'LIMIT', detail: 'CSV' });
    result = client.run('generate', { ...defaultGenerator });
    worker.onerror!({} as ErrorEvent);
    await expect(result).rejects.toMatchObject({ code: 'INTERNAL' });
    await expect(
      new DataClient(() => {
        throw Error('x');
      }).run('generate', { ...defaultGenerator }),
    ).rejects.toMatchObject({ code: 'INTERNAL' });
  });
  it('cancelar sustituye una operación sin aceptar su respuesta tardía', async () => {
    const first = port();
    const second = port();
    let n = 0;
    const client = new DataClient(() => (++n === 1 ? first : second));
    const old = client.run('generate', { ...defaultGenerator });
    const rejected = expect(old).rejects.toMatchObject({ code: 'CANCELLED' });
    const current = client.run('generate', { ...defaultGenerator });
    first.onmessage!({ data: { id: 1, ok: false, code: 'LIMIT', detail: '' } } as MessageEvent);
    client.cancel();
    await rejected;
    await expect(current).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(second.terminate).toHaveBeenCalled();
  });
});
describe('archivos elegidos por el usuario', () => {
  it('limita bytes antes de leer y exige UTF8 y extensión admitida', async () => {
    const file = {
      name: 'data.JSON',
      size: 2,
      arrayBuffer: async () => new Uint8Array([123, 125]).buffer,
    } as File;
    expect(await readDatasetFile(file)).toEqual({ format: 'json', text: '{}' });
    expect((await readDatasetFile({ ...file, name: 'data.csv' } as File)).format).toBe('csv');
    await expect(readDatasetFile({ ...file, name: 'x.exe' } as File)).rejects.toMatchObject({
      code: 'SCHEMA',
    });
    await expect(
      readDatasetFile({ ...file, size: 33 * 1024 * 1024 } as File),
    ).rejects.toMatchObject({ code: 'LIMIT' });
    await expect(
      readDatasetFile({ ...file, arrayBuffer: async () => new Uint8Array([255]).buffer } as File),
    ).rejects.toMatchObject({ code: 'SCHEMA' });
  });
  it('descarga un Blob y revoca su URL después, con nombre fijo seguro', () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:dataset');
    const revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revoke, configurable: true });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadDataset('x,y', 'csv');
    expect(click).toHaveBeenCalled();
    expect(create.mock.calls[0]).toHaveLength(1);
    expect(document.querySelector('a[download]')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(revoke).toHaveBeenCalledWith('blob:dataset');
    downloadDataset('{}', 'json');
  });
  it('formatea rangos grandes sin generar cadenas desbordadas en tablas', () => {
    expect(formatData(null)).toBe('∅');
    expect(formatData('x'.repeat(100))).toHaveLength(65);
    expect(formatData(1e8)).toBe('1,00e+8');
    expect(formatData(0.00001)).toBe('1,00e-5');
    expect(formatData(0.5)).toBe('0,5');
  });
});
