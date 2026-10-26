import { TrainingRuntime } from '@/application/training/runtime';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
export class RuntimeWorkerDouble {
  static deferData = false;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  terminated = false;
  runtime = new TrainingRuntime({
    now: () => performance.now(),
    schedule: (callback, delay) => {
      if (delay)
        setTimeout(() => {
          if (!this.terminated) callback();
        }, delay);
      else
        queueMicrotask(() => {
          if (!this.terminated) callback();
        });
    },
    send: (event) =>
      queueMicrotask(() => {
        if (!this.terminated) this.onmessage?.({ data: structuredClone(event) } as MessageEvent);
      }),
  });
  postMessage(raw: unknown) {
    const command = structuredClone(raw) as { id: number; job?: DataJob };
    queueMicrotask(() => {
      if (this.terminated) return;
      if (command.job) {
        if (!RuntimeWorkerDouble.deferData)
          this.onmessage?.({ data: handleDataJob(command.id, command.job) } as MessageEvent);
      } else this.runtime.receive(command);
    });
  }
  terminate() {
    this.terminated = true;
  }
}
