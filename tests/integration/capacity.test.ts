import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { useCapacityStore } from '@/stores/capacity';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { importExperiment, prepareExperiment } from '@/application/training/experiment';
import { importInferenceModel } from '@/application/training/inference-model';
import CapacityPage from '@/features/generalization/CapacityPage.vue';
import DatasetSplit from '@/features/datasets/DatasetSplit.vue';
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
      { path: '/lab/generalizacion/capacidad', component: CapacityPage },
      { path: '/lab/generalizacion', component: { template: '<h1>Generalización</h1>' } },
      { path: '/lab/entrenamiento', component: { template: '<h1>Entrenamiento</h1>' } },
    ],
  });
  await router.push('/lab/generalizacion/capacidad');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } });
  const study = useCapacityStore();
  study.options.epochs = 5;
  await flushPromises();
  const button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)!;
  return { router, wrapper, study, button };
}
it(
  'calcula sin mutar el laboratorio, conserva configuración ejecutada y abre solo el ensayo confirmado',
  { timeout: 30000 },
  async () => {
    const { wrapper, study, button } = await render();
    const training = useTrainingStore(),
      before = training.state;
    expect(() => study.exportFile('report')).toThrow('NO_STUDY');
    await button('Comparar capacidad y datos').trigger('click');
    await flushPromises();
    expect(
      wrapper.get('table[aria-label="Resumen de capacidad y tamaño"]').findAll('tbody tr'),
    ).toHaveLength(9);
    expect(training.state).toBe(before);
    study.options.noise = 0.4;
    expect(JSON.parse(study.exportFile('report')).options.noise).toBe(0.2);
    await button('Abrir ensayo de capacidad').trigger('click');
    study.selected = 1;
    await flushPromises();
    expect(wrapper.find('[role=group]').exists()).toBe(false);
    study.selected = 99;
    expect(() => study.exportFile('model')).toThrow('NO_TRIAL');
    study.selected = 0;
    await flushPromises();
    const trial = importExperiment(study.exportFile('experiment'));
    expect(prepareExperiment(trial).source.input.train.ids).toHaveLength(24);
    expect(importInferenceModel(study.exportFile('model')).network.spec.hidden).toEqual([]);
    const restore = vi.spyOn(training, 'restore').mockResolvedValue();
    await button('Abrir ensayo de capacidad').trigger('click');
    await button('Volver sin cambiar').trigger('click');
    expect(restore).not.toHaveBeenCalled();
    await button('Abrir ensayo de capacidad').trigger('click');
    await button('Confirmar apertura de capacidad').trigger('click');
    await flushPromises();
    expect(restore).toHaveBeenCalledWith(study.result!.trials[0]!.run.experiment);
    expect(wrapper.text()).toBe('Entrenamiento');
  },
);
it(
  'cancelación, salida, opciones inválidas y fallos conservan resultados y permiten exportar',
  { timeout: 30000 },
  async () => {
    const { wrapper, study, router, button } = await render();
    await study.run();
    const previous = study.result;
    let pending = study.run();
    study.cancel();
    await pending;
    expect(study.result).toBe(previous);
    study.options.epochs = 121;
    await study.run();
    expect(study.error).toContain('límites');
    study.options.epochs = 5;
    pending = study.run();
    await router.push('/lab/entrenamiento');
    await pending;
    expect(study.busy).toBe(false);
    expect(study.result).toBe(previous);
    await router.push('/lab/generalizacion/capacidad');
    await flushPromises();
    vi.spyOn(useTrainingStore(), 'restore').mockRejectedValue(new Error('invalid'));
    await button('Abrir ensayo de capacidad').trigger('click');
    await button('Confirmar apertura de capacidad').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role=alert]').text()).toContain('No se ha abierto');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:capacity');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();
    await button('Exportar informe de capacidad').trigger('click');
    await button('Exportar ensayo de capacidad').trigger('click');
    await button('Exportar modelo de capacidad').trigger('click');
    await vi.advanceTimersByTimeAsync(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
    vi.spyOn(study, 'exportFile').mockImplementation(() => {
      throw new Error('invalid');
    });
    await button('Exportar informe de capacidad').trigger('click');
    expect(wrapper.get('[role=alert]').text()).toContain('No se ha exportado');
  },
);
it(
  'la vista de datos declara el train omitido al restaurar un subconjunto',
  { timeout: 30000 },
  async () => {
    const { study } = await render();
    await study.run();
    const p = prepareExperiment(study.result!.trials[0]!.run.experiment);
    useDatasetsStore().replace(p.dataset, p.split);
    const wrapper = mount(DatasetSplit);
    expect(wrapper.text()).toContain('Subconjunto anidado de train: 24 filas');
    expect(wrapper.text()).toContain('Train sin usar48');
  },
);
