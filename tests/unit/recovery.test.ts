import { describe, expect, it } from 'vitest';
import { initialSession } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { captureExperiment } from '@/application/training/experiment';
import { handleRecovery, recoveryDue } from '@/application/training/recovery';
import { TrainingRecovery, type RecoveryCapture } from '@/infrastructure/storage/training-recovery';
import { libraryPort } from '../fixtures/library-port';
import { trainingFixture } from '../fixtures/training';
function args(): RecoveryCapture {
  const f = trainingFixture();
  return [
    f.dataset,
    f.split,
    f.prepared.pipeline.options,
    f.input.pipelineHash,
    f.config,
    exhaust(initialSession(f.input)),
    0.5,
    1,
    false,
  ];
}
describe('recuperación transaccional', () => {
  it('cadencia de 30 segundos o cinco épocas y fronteras forzadas', () => {
    expect(recoveryDue(undefined, 0, 0, false)).toBe(true);
    expect(recoveryDue({ at: 100, epoch: 2 }, 30099, 6, false)).toBe(false);
    expect(recoveryDue({ at: 100, epoch: 2 }, 30100, 6, false)).toBe(true);
    expect(recoveryDue({ at: 100, epoch: 2 }, 101, 7, false)).toBe(true);
    expect(recoveryDue({ at: 100, epoch: 2 }, 101, 2, true)).toBe(true);
  });
  it('dos slots completos, revisión, cuota, fallback y eliminación sin tocar biblioteca', async () => {
    const port = libraryPort(),
      repo = new TrainingRecovery(() => port.factory),
      input = args();
    expect(await repo.read()).toBeUndefined();
    await repo.save(input, 'tab-a', 0, false);
    await repo.save(input, 'tab-a', 1, false);
    const record = await repo.read();
    expect(record?.summary.slots).toHaveLength(2);
    expect(ArrayBuffer.isView(record?.snapshot.checkpoint.model.layers[0]!.weights)).toBe(true);
    await expect(repo.save(input, 'tab-b', 2, false)).rejects.toThrow('CONFLICT');
    await expect(repo.save(input, 'tab-b', 1, true)).rejects.toThrow('CONFLICT');
    port.failWrite(new DOMException('full', 'QuotaExceededError'));
    await expect(repo.save(input, 'tab-a', 2, false)).rejects.toThrow('QUOTA');
    expect((await repo.read())?.summary.revision).toBe(2);
    const raw = port.tables.trainingRecovery!.get('active') as { slots: { integrity: string }[] };
    raw.slots[0]!.integrity = 'bad';
    expect((await repo.read())?.fallback).toBe(true);
    raw.slots[1]!.integrity = 'bad';
    await expect(repo.read()).rejects.toThrow('CORRUPT');
    await expect(repo.remove(1)).rejects.toThrow('CONFLICT');
    await repo.remove(2);
    expect(await repo.read()).toBeUndefined();
    expect(port.tables.experiments).toBeDefined();
    expect(port.tables.learningEvidence).toBeDefined();
  });
  it('dispatcher transmite errores sin datos sensibles y permite apropiación explícita', async () => {
    const port = libraryPort(),
      repo = new TrainingRecovery(() => port.factory);
    expect((await handleRecovery({ type: 'read' }, repo)).ok).toBe(true);
    await handleRecovery(
      { type: 'save', args: args(), owner: 'a', revision: 0, replace: false },
      repo,
    );
    expect(
      await handleRecovery(
        { type: 'save', args: args(), owner: 'b', revision: 1, replace: false },
        repo,
      ),
    ).toEqual({ ok: false, code: 'CONFLICT' });
    expect(
      (
        await handleRecovery(
          { type: 'save', args: args(), owner: 'b', revision: 1, replace: true },
          repo,
        )
      ).ok,
    ).toBe(true);
    expect((await handleRecovery({ type: 'remove', revision: 2 }, repo)).ok).toBe(true);
    const bad = args();
    bad[6] = -1;
    expect(
      (
        await handleRecovery(
          { type: 'save', args: bad, owner: 'b', revision: 0, replace: false },
          repo,
        )
      ).ok,
    ).toBe(false);
    expect(captureExperiment(...args()).testConsulted).toBe(false);
  });
  it('fallback conserva el bloqueo de test aunque se recupere un estado anterior', async () => {
    const port = libraryPort(),
      repo = new TrainingRecovery(() => port.factory),
      input = args();
    await repo.save(input, 'a', 0, false);
    input[5].frozen = true;
    input[8] = true;
    await repo.save(input, 'a', 1, false);
    const raw = port.tables.trainingRecovery!.get('active') as { slots: { integrity: string }[] };
    raw.slots[0]!.integrity = 'bad';
    const recovered = await repo.read();
    expect(recovered?.fallback).toBe(true);
    expect(recovered?.snapshot.checkpoint.frozen).toBe(true);
    expect(recovered?.snapshot.testConsulted).toBe(true);
    await repo.save(input, 'a', 2, false);
    expect((await repo.read())?.summary.slots).toHaveLength(2);
  });
});
