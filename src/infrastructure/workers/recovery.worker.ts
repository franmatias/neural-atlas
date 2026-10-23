import { handleRecovery, type RecoveryCommand } from '@/application/training/recovery';
self.onmessage = async ({ data }: MessageEvent<RecoveryCommand>) => {
  self.postMessage(await handleRecovery(data));
};
