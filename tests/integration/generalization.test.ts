import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { useGeneralizationStore } from '@/stores/generalization';
import { useTrainingStore } from '@/stores/training';
import { usePreferencesStore } from '@/stores/preferences';
import { importExperiment } from '@/application/training/experiment';
import GeneralizationPage from '@/features/generalization/GeneralizationPage.vue';
class WorkerDouble {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  terminated = false;
  postMessage(message: { id: number; job: DataJob }) {
    const copy = structuredClone(message);
    queueMicrotask(() => {
      if (!this.terminated)
        this.onmessage?.({ data: handleDataJob(copy.id, copy.job) } as MessageEvent);
    });
  }
  terminate() {
    this.terminated = true;
  }
}
let pinia: Pinia;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal('Worker', WorkerDouble);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lab/generalizacion', component: GeneralizationPage },
      { path: '/lab/entrenamiento', component: { template: '<h1>Entrenamiento</h1>' } },
    ],
  });
  await router.push('/lab/generalizacion');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const session = useGeneralizationStore();
  session.options.epochs = 5;
  return { wrapper, router, session };
}
it('calcula, distingue configuración ejecutada y actual, exporta y requiere apertura explícita', async () => {
  const { wrapper, session } = await render(),
    training = useTrainingStore();
  const before = training.state;
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Comparar con referencia')!
    .trigger('click');
  await flushPromises();
  expect(
    wrapper.find('table[aria-label="Comparación de generalización"]').findAll('tbody tr'),
  ).toHaveLength(2);
  expect(training.state).toBe(before);
  expect(wrapper.text()).toContain('Test reservado: 24');
  session.options.lambda = 0.04;
  await flushPromises();
  expect(wrapper.text()).toContain('λ = 0,01');
  const file = importExperiment(session.exportRun(1));
  expect(file.config.regularization?.l2).toBe(0.01);
  const restore = vi.spyOn(training, 'restore').mockResolvedValue();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Abrir ensayo en entrenamiento')!
    .trigger('click');
  expect(restore).not.toHaveBeenCalled();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Confirmar apertura')!
    .trigger('click');
  await flushPromises();
  expect(restore).toHaveBeenCalledWith(session.result!.runs[1]!.experiment);
  expect(wrapper.text()).toBe('Entrenamiento');
});
it('cancela sin perder resultados, valida límites, cambia ensayo y respeta movimiento reducido', async () => {
  const { wrapper, session, router } = await render();
  await session.run();
  const previous = session.result;
  const pending = session.run();
  session.cancel();
  await pending;
  expect(session.result).toBe(previous);
  expect(session.busy).toBe(false);
  session.options.epochs = 200;
  await session.run();
  expect(session.error).toContain('límites');
  expect(session.result).toBe(previous);
  expect(() => session.exportRun(9)).toThrow('NO_RESULT');
  session.options.epochs = 5;
  session.options.intervention = 'clip';
  await session.run();
  await flushPromises();
  expect(wrapper.text()).toContain('c = 0,1');
  const select = wrapper
    .findAll('select')
    .find((control) =>
      control.element.parentElement?.textContent?.includes('Ensayo para inspeccionar'),
    )!;
  await select.setValue('0');
  usePreferencesStore().update({ motion: 'reduced' });
  await flushPromises();
  expect(wrapper.find('input[type=checkbox]').attributes('disabled')).toBeDefined();
  const inFlight = session.run();
  await router.push('/lab/entrenamiento');
  await inFlight;
  expect(session.busy).toBe(false);
});
it('un fallo al abrir o exportar conserva los resultados y permite cancelar confirmación', async () => {
  const { wrapper, session } = await render();
  await session.run();
  await flushPromises();
  vi.spyOn(useTrainingStore(), 'restore').mockRejectedValue(new Error('invalid'));
  const button = (name: string) =>
    wrapper.findAll('button').find((button) => button.text() === name)!;
  await button('Abrir ensayo en entrenamiento').trigger('click');
  await button('Volver sin cambiar').trigger('click');
  expect(wrapper.find('[role=group]').exists()).toBe(false);
  await button('Abrir ensayo en entrenamiento').trigger('click');
  await button('Confirmar apertura').trigger('click');
  await flushPromises();
  expect(wrapper.get('[role=alert]').text()).toContain('No se ha abierto');
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:result');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.useFakeTimers();
  await button('Exportar ensayo JSON').trigger('click');
  await vi.advanceTimersByTimeAsync(1000);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:result');
  vi.spyOn(session, 'exportRun').mockImplementation(() => {
    throw new Error('invalid');
  });
  await button('Exportar ensayo JSON').trigger('click');
  expect(wrapper.get('[role=alert]').text()).toContain('No se ha exportado');
});
it('multisemilla se ejecuta en el Worker, inspecciona parejas y exporta sin tocar el laboratorio', async () => {
  const { wrapper, session } = await render();
  const training = useTrainingStore(),
    before = training.state;
  expect(() => session.exportStudy()).toThrow('NO_STUDY');
  expect(() => session.selectPair(0)).toThrow('NO_PAIR');
  const button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)!;
  await button('Comparar múltiples semillas').trigger('click');
  await flushPromises();
  expect(session.study!.measurements.map((m) => m.seed)).toEqual([42, 43, 44]);
  expect(
    wrapper.get('table[aria-label="Resultados por semilla"]').findAll('tbody tr'),
  ).toHaveLength(3);
  expect(training.state).toBe(before);
  await button('Abrir ensayo en entrenamiento').trigger('click');
  const select = wrapper
    .findAll('select')
    .find((s) => s.element.parentElement?.textContent?.includes('Pareja para inspeccionar'))!;
  await select.setValue('2');
  await flushPromises();
  expect(wrapper.find('[role=group]').exists()).toBe(false);
  expect(session.result!.runs[1]!.experiment.config.seed).toBe(44);
  expect(importExperiment(session.exportRun(1)).config.seed).toBe(44);
  session.options.seed = 123;
  expect(JSON.parse(session.exportStudy()).options.comparison.seed).toBe(42);
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:study');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.useFakeTimers();
  await button('Exportar informe multisemilla').trigger('click');
  await vi.advanceTimersByTimeAsync(1000);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:study');
  vi.spyOn(session, 'exportStudy').mockImplementation(() => {
    throw new Error('invalid');
  });
  await button('Exportar informe multisemilla').trigger('click');
  expect(wrapper.get('[role=alert]').text()).toContain('No se ha exportado');
});
it('cancelar, fallar o abandonar un estudio conserva resultados completos y una pareja simple sustituye el estudio', async () => {
  const { session, router } = await render();
  await session.runStudy();
  const previous = session.study;
  const previousPair = session.result;
  let pending = session.runStudy();
  session.cancel();
  await pending;
  expect(session.study).toBe(previous);
  expect(session.result).toBe(previousPair);
  session.firstSeed = -1;
  await session.runStudy();
  expect(session.error).toContain('límites');
  expect(session.study).toBe(previous);
  session.firstSeed = 0;
  pending = session.runStudy();
  await router.push('/lab/entrenamiento');
  await pending;
  expect(session.busy).toBe(false);
  expect(session.study).toBe(previous);
  await session.run();
  expect(session.study).toBeUndefined();
  expect(session.result!.runs).toHaveLength(2);
});
