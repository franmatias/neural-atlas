import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { requestRecovery } from '@/infrastructure/workers/recovery-client';
import { useRecoveryStore } from '@/stores/recovery';
import { useTrainingStore } from '@/stores/training';
import { handleRecovery } from '@/application/training/recovery';
import type { RecoveryResult } from '@/application/training/recovery';
import { TrainingRecovery, type RecoveryCapture } from '@/infrastructure/storage/training-recovery';
import { LibraryError } from '@/infrastructure/storage/database';
import { initialSession } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import RecoveryPanel from '@/features/training/RecoveryPanel.vue';
import { libraryPort } from '../fixtures/library-port';
import { trainingFixture } from '../fixtures/training';
vi.mock('@/infrastructure/workers/recovery-client', () => ({ requestRecovery: vi.fn() }));
let pinia: Pinia, repo: TrainingRecovery;
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
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  const port = libraryPort();
  repo = new TrainingRecovery(() => port.factory);
  vi.mocked(requestRecovery).mockImplementation(async (command) => {
    const response = await handleRecovery(command, repo);
    if (!response.ok) throw new LibraryError(response.code);
    return response.result;
  });
});
afterEach(() => {
  disposePinia(pinia);
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
it('guarda, limita cadencia, desactiva, recupera con confirmación y elimina', async () => {
  const recovery = useRecoveryStore();
  recovery.offer(args());
  expect(requestRecovery).not.toHaveBeenCalled();
  await recovery.load();
  recovery.offer(args());
  await flushPromises();
  expect(recovery.available?.revision).toBe(1);
  recovery.offer(args());
  await flushPromises();
  expect(recovery.available?.revision).toBe(1);
  recovery.enabled = false;
  recovery.offer(args(), true);
  await flushPromises();
  expect(recovery.available?.revision).toBe(1);
  recovery.enabled = true;
  recovery.offer(args(), true);
  await flushPromises();
  expect(recovery.available?.slots).toHaveLength(2);
  const session = useTrainingStore();
  await flushPromises();
  const restore = vi.spyOn(session, 'restore').mockResolvedValue();
  const wrapper = mount(RecoveryPanel, { global: { plugins: [pinia] } });
  await wrapper.get('input').setValue(false);
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Recuperar sesión guardada')!
    .trigger('click');
  expect(restore).not.toHaveBeenCalled();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Confirmar recuperación')!
    .trigger('click');
  await flushPromises();
  expect(restore).toHaveBeenCalledOnce();
  await recovery.remove();
  expect(recovery.available).toBeUndefined();
  expect(await recovery.recover()).toBeUndefined();
  wrapper.unmount();
});
it('conserva el primer escritor y exige revisar y apropiarse explícitamente', async () => {
  await repo.save(args(), 'other', 0, false);
  const recovery = useRecoveryStore();
  await recovery.load();
  recovery.offer(args(), true);
  await flushPromises();
  expect(recovery.available?.revision).toBe(1);
  recovery.takeOver();
  recovery.offer(args(), true);
  await flushPromises();
  expect(recovery.available?.revision).toBe(2);
  await repo.save(args(), 'other', 2, true);
  recovery.offer(args(), true);
  await flushPromises();
  expect(recovery.message).toContain('Otra pestaña');
  await recovery.remove();
  expect(recovery.message).toContain('No se han eliminado');
  await recovery.load();
  const restored = await recovery.recover();
  expect(restored).toBeDefined();
  vi.mocked(requestRecovery).mockRejectedValue(new LibraryError('QUOTA'));
  recovery.offer(args(), true);
  await flushPromises();
  expect(recovery.message).toContain('No se pudo guardar');
  await recovery.recover();
  expect(recovery.message).toContain('No se pudo validar');
  await recovery.load();
  expect(recovery.message).toContain('no disponible');
});
it('serializa escrituras y conserva solo el último candidato pendiente', async () => {
  const recovery = useRecoveryStore();
  await recovery.load();
  let resolve!: (value: RecoveryResult) => void;
  const original = vi.mocked(requestRecovery).getMockImplementation()!;
  vi.mocked(requestRecovery).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  recovery.offer(args(), true);
  recovery.offer(args(), true);
  expect(recovery.saving).toBe(true);
  await recovery.load();
  await recovery.remove();
  expect(await recovery.recover()).toBeUndefined();
  recovery.takeOver();
  const summary = await original({
    type: 'save',
    args: args(),
    owner: 'deferred',
    revision: 0,
    replace: false,
  });
  resolve(summary);
  await flushPromises();
  expect(recovery.saving).toBe(false);
  expect(recovery.message).toContain('Otra pestaña');
});
