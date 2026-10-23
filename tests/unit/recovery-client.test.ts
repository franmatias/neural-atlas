import { afterEach, expect, it, vi } from 'vitest';
import { requestRecovery } from '@/infrastructure/workers/recovery-client';
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('cierra el Worker tras éxito, error, timeout y fallo de envío', async () => {
  const workers: Port[] = [];
  class Port {
    onmessage?: (event: { data: unknown }) => void;
    onerror?: () => void;
    terminate = vi.fn();
    postMessage = vi.fn();
    constructor() {
      workers.push(this);
    }
  }
  vi.stubGlobal('indexedDB', {});
  vi.stubGlobal('Worker', Port);
  const success = requestRecovery({ type: 'read' });
  workers[0]!.onmessage!({ data: { ok: true, result: undefined } });
  expect(await success).toBeUndefined();
  expect(workers[0]!.terminate).toHaveBeenCalledOnce();
  const failure = requestRecovery({ type: 'read' });
  workers[1]!.onmessage!({ data: { ok: false, code: 'CORRUPT' } });
  await expect(failure).rejects.toThrow('CORRUPT');
  const crash = requestRecovery({ type: 'read' });
  workers[2]!.onerror!();
  await expect(crash).rejects.toThrow('UNAVAILABLE');
  vi.useFakeTimers();
  const timeout = requestRecovery({ type: 'read' });
  const rejected = expect(timeout).rejects.toThrow('UNAVAILABLE');
  await vi.advanceTimersByTimeAsync(15000);
  await rejected;
  vi.stubGlobal(
    'Worker',
    class extends Port {
      postMessage = vi.fn(() => {
        throw new Error('clone');
      });
    },
  );
  await expect(requestRecovery({ type: 'read' })).rejects.toThrow('UNAVAILABLE');
  vi.stubGlobal('indexedDB', undefined);
  await expect(requestRecovery({ type: 'read' })).rejects.toThrow('UNAVAILABLE');
});
