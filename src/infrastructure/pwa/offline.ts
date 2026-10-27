export type OfflineRegistration = ServiceWorkerRegistration;
export interface OfflineStatus {
  version: string;
  ready: boolean;
  count: number;
}
export class OfflineClient {
  constructor(
    private readonly service: ServiceWorkerContainer | undefined = 'serviceWorker' in navigator
      ? navigator.serviceWorker
      : undefined,
  ) {}
  async registration(install = false) {
    if (!this.service) throw Error('UNSUPPORTED');
    const base = import.meta.env.BASE_URL;
    return install
      ? this.service.register(base + 'sw.js', { scope: base, updateViaCache: 'none' })
      : this.service.getRegistration(base);
  }
  async status(worker: ServiceWorker): Promise<OfflineStatus> {
    return this.message(worker, { type: 'STATUS' }) as Promise<OfflineStatus>;
  }
  private message(worker: ServiceWorker, message: unknown, timeoutMs = 6000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const channel = new globalThis.MessageChannel();
      const timer = setTimeout(() => {
        channel.port1.close();
        reject(Error('OFFLINE_TIMEOUT'));
      }, timeoutMs);
      channel.port1.onmessage = (e) => {
        clearTimeout(timer);
        channel.port1.close();
        resolve(e.data);
      };
      try {
        worker.postMessage(message, [channel.port2]);
      } catch (error) {
        clearTimeout(timer);
        channel.port1.close();
        channel.port2.close();
        reject(error);
      }
    });
  }
  async repair(worker: ServiceWorker) {
    const result = (await this.message(worker, { type: 'REPAIR' }, 60000)) as { ready?: boolean };
    if (!result.ready) throw Error('PRECACHE_INCOMPLETE');
  }
  async activate(registration: ServiceWorkerRegistration) {
    if (!registration.waiting) throw Error('NO_UPDATE');
    const response = (await this.message(registration.waiting, { type: 'ACTIVATE' })) as {
      accepted?: boolean;
      blocked?: boolean;
    };
    if (!response.accepted) throw Error('OTHER_TABS');
  }
  onChange(callback: () => void) {
    this.service?.addEventListener('controllerchange', callback);
    return () => this.service?.removeEventListener('controllerchange', callback);
  }
}
