import { it, expect, vi, afterEach } from 'vitest';
import { OfflineClient } from '@/infrastructure/pwa/offline';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
class Channel {
  port1 = { onmessage: null as null | ((e: { data: unknown }) => void), close: vi.fn() };
  port2 = {
    postMessage: (value: unknown) => queueMicrotask(() => this.port1.onmessage?.({ data: value })),
    close: vi.fn(),
  };
}
it('registra con ámbito propio, consulta estado y activa solo respuesta aceptada', async () => {
  vi.stubGlobal('MessageChannel', Channel);
  const worker = {
    postMessage: vi.fn((message: { type: string }, ports: Channel['port2'][]) =>
      ports[0]!.postMessage(
        message.type === 'REPAIR'
          ? { ready: true }
          : message.type === 'STATUS'
            ? { version: '1.1.0', ready: true, count: 120 }
            : { accepted: true },
      ),
    ),
  } as unknown as ServiceWorker;
  const registration = { waiting: worker } as ServiceWorkerRegistration,
    service = {
      register: vi.fn(async () => registration),
      getRegistration: vi.fn(async () => registration),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as ServiceWorkerContainer;
  const client = new OfflineClient(service);
  expect(await client.registration()).toBe(registration);
  expect(await client.registration(true)).toBe(registration);
  expect(service.register).toHaveBeenCalledWith(import.meta.env.BASE_URL + 'sw.js', {
    scope: import.meta.env.BASE_URL,
    updateViaCache: 'none',
  });
  expect(await client.status(worker)).toEqual({ version: '1.1.0', ready: true, count: 120 });
  await client.activate(registration);
  await client.repair(worker);
  const callback = vi.fn(),
    stop = client.onChange(callback);
  stop();
  expect(service.removeEventListener).toHaveBeenCalledWith('controllerchange', callback);
  await expect(client.activate({ waiting: null } as ServiceWorkerRegistration)).rejects.toThrow(
    'NO_UPDATE',
  );
  const blocked = {
    waiting: {
      postMessage: (_: unknown, ports: Channel['port2'][]) =>
        ports[0]!.postMessage({ blocked: true }),
    },
  } as unknown as ServiceWorkerRegistration;
  await expect(client.activate(blocked)).rejects.toThrow('OTHER_TABS');
  await expect(
    client.repair({
      postMessage: (_: unknown, ports: Channel['port2'][]) =>
        ports[0]!.postMessage({ ready: false }),
    } as unknown as ServiceWorker),
  ).rejects.toThrow('PRECACHE_INCOMPLETE');
  vi.unstubAllGlobals();
});
it('sin soporte y sin respuesta informa el fallo sin fingir disponibilidad', async () => {
  vi.stubGlobal('MessageChannel', Channel);
  vi.useFakeTimers();
  const client = new OfflineClient({} as ServiceWorkerContainer);
  const pending = expect(
    client.status({ postMessage: () => {} } as unknown as ServiceWorker),
  ).rejects.toThrow('OFFLINE_TIMEOUT');
  await vi.advanceTimersByTimeAsync(6000);
  await pending;
  const unsupported = new OfflineClient(undefined);
  await expect(unsupported.registration()).rejects.toThrow('UNSUPPORTED');
  unsupported.onChange(() => {})();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
