import type {
  RecoveryCommand,
  RecoveryResponse,
  RecoveryResult,
} from '@/application/training/recovery';
import { LibraryError } from '@/infrastructure/storage/database';
/** Each request owns its Worker. Acknowledgement follows transaction completion. */
export function requestRecovery(command: RecoveryCommand): Promise<RecoveryResult> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new LibraryError('UNAVAILABLE'));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./recovery.worker.ts', import.meta.url), { type: 'module' });
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new LibraryError('UNAVAILABLE'));
    }, 15000);
    const finish = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    worker.onmessage = ({ data }: MessageEvent<RecoveryResponse>) => {
      finish();
      if (data.ok) resolve(data.result);
      else reject(new LibraryError(data.code));
    };
    worker.onerror = () => {
      finish();
      reject(new LibraryError('UNAVAILABLE'));
    };
    try {
      worker.postMessage(command);
    } catch {
      finish();
      reject(new LibraryError('UNAVAILABLE'));
    }
  });
}
