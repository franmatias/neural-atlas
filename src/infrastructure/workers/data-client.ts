import { DataError } from '@/domain/data/types';
import type { DataJob, DataResponse, JobPayloads, JobResults } from '@/application/data/jobs';
export interface WorkerPort {
  onmessage: ((event: MessageEvent<DataResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: { id: number; job: DataJob }): void;
  terminate(): void;
}
const activeClients = new Set<DataClient>();
export function activeDataJobs() {
  return activeClients.size;
}
export class DataClient {
  private worker?: WorkerPort;
  private reject?: (error: DataError) => void;
  private sequence = 0;
  constructor(
    private readonly factory: () => WorkerPort = () =>
      new Worker(new URL('./data.worker.ts', import.meta.url), { type: 'module' }),
  ) {}
  cancel() {
    activeClients.delete(this);
    this.worker?.terminate();
    this.worker = undefined;
    this.reject?.(new DataError('CANCELLED'));
    this.reject = undefined;
  }
  run<K extends keyof JobPayloads>(kind: K, payload: JobPayloads[K]): Promise<JobResults[K]> {
    this.cancel();
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.reject = reject;
      try {
        const worker = this.factory();
        this.worker = worker;
        activeClients.add(this);
        const cleanup = () => {
          activeClients.delete(this);
          worker.terminate();
          if (this.worker === worker) {
            this.worker = undefined;
            this.reject = undefined;
          }
        };
        worker.onmessage = (event) => {
          if (event.data.id !== id || this.worker !== worker) return;
          cleanup();
          if (event.data.ok) resolve(event.data.result as JobResults[K]);
          else reject(new DataError(event.data.code, event.data.detail));
        };
        worker.onerror = () => {
          cleanup();
          reject(new DataError('INTERNAL'));
        };
        worker.postMessage({ id, job: { kind, payload } as DataJob });
      } catch {
        activeClients.delete(this);
        this.reject = undefined;
        this.worker?.terminate();
        this.worker = undefined;
        reject(new DataError('INTERNAL'));
      }
    });
  }
}
