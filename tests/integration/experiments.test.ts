import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { useExperimentsStore } from '@/stores/experiments';
import { useDatasetsStore } from '@/stores/datasets';
import { useTrainingStore } from '@/stores/training';
import ExperimentsPage from '@/features/experiments/ExperimentsPage.vue';
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lab/experimentos', component: ExperimentsPage },
      { path: '/lab/entrenamiento', component: { template: '<h1>Entrenamiento</h1>' } },
      { path: '/lab/datos', component: { template: '<h1>Datos</h1>' } },
    ],
  });
  await router.push('/lab/experimentos');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } });
  const study = useExperimentsStore();
  study.epochs = 5;
  await flushPromises();
  const button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)!;
  return { router, wrapper, study, button };
}
it('A/B conserva laboratorio e hipótesis, destaca cambios y abre solo el ensayo confirmado', async () => {
  const { wrapper, study, button } = await render(),
    training = useTrainingStore();
  const before = training.state;
  study.copyWorkspace();
  expect(study.error).toContain('división válida');
  expect(() => study.exportReport()).toThrow('NO_RESULT');
  study.hypothesis = 'Otra capacidad cambia el ajuste.';
  await button('Ejecutar estudio').trigger('click');
  await flushPromises();
  expect(
    wrapper.get('table[aria-label="Resultados de experimentos A/B"]').findAll('tbody tr'),
  ).toHaveLength(2);
  expect(wrapper.text()).toContain('Capas ocultas');
  expect(study.abResult!.probes).toHaveLength(8);
  expect(training.state).toBe(before);
  study.b.optimizer.rate = 0.4;
  study.reflection = 'Necesito repetir con más semillas.';
  const report = JSON.parse(study.exportReport());
  expect(report.options.b.optimizer.rate).toBe(0.01);
  expect(report.options.hypothesis).toBe('Otra capacidad cambia el ajuste.');
  expect(report.reflection).toContain('más semillas');
  await button('Abrir ensayo seleccionado').trigger('click');
  study.selectedAB = 0;
  await flushPromises();
  expect(wrapper.find('[role=group]').exists()).toBe(false);
  const restore = vi.spyOn(training, 'restore').mockResolvedValue();
  await button('Abrir ensayo seleccionado').trigger('click');
  await button('Confirmar apertura del estudio').trigger('click');
  await flushPromises();
  expect(restore).toHaveBeenCalledWith(study.abResult!.runs[0]!.experiment);
  expect(wrapper.text()).toBe('Entrenamiento');
});
it('CV agrupada conserva test consultado, desactiva early stopping y permite inspeccionar folds', async () => {
  const { wrapper, study } = await render(),
    training = useTrainingStore();
  study.preset('grouped');
  useDatasetsStore().replace(study.source!.dataset, study.source!.split);
  training.config.earlyStopping = { patience: 5, minDelta: 0.001 };
  training.consulted = true;
  study.copyWorkspace();
  study.mode = 'cv';
  study.folds = 5;
  await study.run();
  await flushPromises();
  expect(
    wrapper.get('table[aria-label="Resultados de validación cruzada"]').findAll('tbody tr'),
  ).toHaveLength(5);
  expect(study.cvResult!.options.config.earlyStopping).toBeUndefined();
  expect(study.cvResult!.options.testPreviouslyConsulted).toBe(true);
  study.selectedFold = 2;
  expect(study.selected!.testConsulted).toBe(true);
  expect(study.selected!.config.earlyStopping).toBeUndefined();
  study.preset('flowers');
  expect(study.a.spec.task).toBe('multiclass');
  expect(study.a.spec.classes).toBe(3);
  study.preset('sine');
  expect(study.a.spec.task).toBe('regression');
  expect(JSON.parse(study.exportReport()).folds).toHaveLength(5);
  expect(
    wrapper
      .find('svg[aria-label="Distribución de train, validación y test en cada fold"]')
      .exists(),
  ).toBe(true);
});
it('cancelar, fallar o salir conserva resultados; exportación y apertura fallidas no los borran', async () => {
  const { wrapper, study, router, button } = await render();
  await study.run();
  const previous = study.abResult;
  let pending = study.run();
  study.cancel();
  await pending;
  expect(study.abResult).toBe(previous);
  study.mode = 'cv';
  study.folds = 1;
  await study.run();
  expect(study.error).toContain('soporte');
  study.mode = 'ab';
  study.epochs = 121;
  await study.run();
  expect(study.abResult).toBe(previous);
  study.epochs = 5;
  pending = study.run();
  await router.push('/lab/datos');
  await pending;
  expect(study.busy).toBe(false);
  await router.push('/lab/experimentos');
  await flushPromises();
  vi.spyOn(useTrainingStore(), 'restore').mockRejectedValue(new Error('invalid'));
  await button('Abrir ensayo seleccionado').trigger('click');
  await button('Volver sin cambiar').trigger('click');
  await button('Abrir ensayo seleccionado').trigger('click');
  await button('Confirmar apertura del estudio').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('No se ha abierto');
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:study');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.useFakeTimers();
  for (const name of [
    'Exportar informe del estudio',
    'Exportar experimento seleccionado',
    'Exportar modelo seleccionado',
  ])
    await button(name).trigger('click');
  await vi.advanceTimersByTimeAsync(1000);
  expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3);
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
    throw new Error('quota');
  });
  await button('Exportar informe del estudio').trigger('click');
  await button('Exportar modelo seleccionado').trigger('click');
  expect(wrapper.text()).toContain('No se ha exportado');
  const source = study.source;
  study.preset('unknown');
  expect(study.source).toBe(source);
});
