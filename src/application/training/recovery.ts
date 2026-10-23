import { TrainingRecovery, type RecoveryCapture } from '@/infrastructure/storage/training-recovery';
import { LibraryError } from '@/infrastructure/storage/database';
export type RecoveryCommand =
  | { type: 'read' }
  | { type: 'save'; args: RecoveryCapture; owner: string; revision: number; replace: boolean }
  | { type: 'remove'; revision: number };
export type RecoveryResult =
  | Awaited<ReturnType<TrainingRecovery['read']>>
  | Awaited<ReturnType<TrainingRecovery['save']>>
  | void;
export type RecoveryResponse =
  { ok: true; result: RecoveryResult } | { ok: false; code: LibraryError['code'] };
export async function handleRecovery(
  command: RecoveryCommand,
  library = new TrainingRecovery(),
): Promise<RecoveryResponse> {
  try {
    const result =
      command.type === 'read'
        ? await library.read()
        : command.type === 'remove'
          ? await library.remove(command.revision)
          : await library.save(command.args, command.owner, command.revision, command.replace);
    return { ok: true, result };
  } catch (error) {
    return { ok: false, code: error instanceof LibraryError ? error.code : 'UNAVAILABLE' };
  }
}
export function recoveryDue(
  last: { at: number; epoch: number } | undefined,
  now: number,
  epoch: number,
  force: boolean,
) {
  return force || !last || now - last.at >= 30000 || epoch - last.epoch >= 5;
}
