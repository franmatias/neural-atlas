import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { RuntimeWorkerDouble } from '../fixtures/runtime-worker';
import { useRobustnessStore } from '@/stores/robustness';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { trainingFixture } from '../fixtures/training';
import RobustnessPage from '@/features/experiments/RobustnessPage.vue';
import ProjectionComparison from '@/features/experiments/ProjectionComparison.vue';
import { compareModels } from '@/application/training/paired-comparison';
import { exportDatasetJson } from '@/application/data/json-files';
let pinia: Pinia;
it('el proyector usa escalas comunes para no exagerar visualmente diferencias de pérdida', () => {
  const f = trainingFixture(),
    a = { ...f.config, spec: { ...f.config.spec, hidden: [] }, epochs: 3 };
  const result = compareModels({
    datasetJson: exportDatasetJson(f.dataset, f.split),
    a,
    b: { ...f.config, epochs: 3 },
    pipelineA: f.prepared.pipeline.options,
    pipelineB: f.prepared.pipeline.options,
    testPreviouslyConsulted: false,
    hypothesis: 'Comparación con ejes comunes.',
  });
  const wrapper = mount(ProjectionComparison, {
    props: { result, modelValue: 0 },
    global: { plugins: [pinia] },
  });
  const maxima = wrapper.findAll('.loss-chart svg text[x="5"]').map((n) => n.text());
  expect(maxima).toHaveLength(2);
  expect(maxima[0]).toBe(maxima[1]);
  expect(wrapper.text()).toContain('misma escala vertical');
  wrapper.unmount();
});
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  RuntimeWorkerDouble.deferData = false;
  vi.stubGlobal('Worker', RuntimeWorkerDouble);
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it('robustez conserva resultados registrados, contexto del laboratorio y cancelación', async () => {
  const study = useRobustnessStore(),
    data = useDatasetsStore(),
    training = useTrainingStore();
  const dataBefore = data.dataset;
  study.preset('flowers');
  study.config.epochs = 2;
  study.firstSeed = 9;
  await study.run();
  expect(study.dispersionResult!.runs).toHaveLength(3);
  expect(data.dataset).toBe(dataBefore);
  expect(training.state).toBeUndefined();
  study.config.epochs = 10;
  study.firstSeed = 100;
  study.reflection = 'Repetir no demuestra causalidad.';
  expect(JSON.parse(study.report())).toMatchObject({
    options: { config: { epochs: 2 }, firstSeed: 9 },
    reflection: 'Repetir no demuestra causalidad.',
  });
  const previous = study.dispersionResult;
  RuntimeWorkerDouble.deferData = true;
  const pending = study.run();
  await flushPromises();
  expect(study.busy).toBe(true);
  study.cancel();
  await pending;
  expect(study.busy).toBe(false);
  expect(study.dispersionResult).toBe(previous);
  study.copyWorkspace();
  expect(study.error).toContain('divide');
  const f = trainingFixture();
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  training.consulted = true;
  study.copyWorkspace();
  expect(study.previousTest).toBe(true);
  expect(study.source!.dataset).not.toBe(data.dataset);
});
it('registrar un segmento preserva pesos, aplica el cambio solo en el siguiente lote y rechaza duplicados', async () => {
  const f = trainingFixture(),
    data = useDatasetsStore(),
    training = useTrainingStore();
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  training.config = structuredClone(f.config);
  await flushPromises();
  training.initialize();
  await flushPromises();
  training.command('STEP_BATCH');
  await flushPromises();
  const weights = Array.from(training.state!.model.layers[0]!.weights);
  await training.appendSegment('momentum', 0.02, false);
  await flushPromises();
  expect(training.status).toBe('ready');
  expect(training.state!.updates).toBe(1);
  expect(Array.from(training.state!.model.layers[0]!.weights)).toEqual(weights);
  expect(training.capture().schemaVersion).toBe(9);
  await training.appendSegment('adam', 0.01, false);
  expect(training.error).toBe('SEGMENT_ADVANCE_FIRST');
  training.command('STEP_BATCH');
  await flushPromises();
  expect(training.state!.updates).toBe(2);
  expect(training.capture().timeline).toHaveLength(2);
});
it('pantalla de robustez integra resultados, cambio de escenario y navegación que cancela', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lab/experimentos/robustez', component: RobustnessPage },
      { path: '/lab/experimentos', component: { template: '<div>Comparador</div>' } },
    ],
  });
  await router.push('/lab/experimentos/robustez');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } }),
    study = useRobustnessStore();
  study.config.epochs = 2;
  await study.run();
  await flushPromises();
  expect(wrapper.find('table[aria-label="Dispersión de predicciones"]').exists()).toBe(true);
  const selector = wrapper
    .findAll('label')
    .find((l) => l.text().startsWith('Sonda de dispersión'))!
    .get('select');
  await selector.setValue('1');
  expect((selector.element as HTMLSelectElement).value).toBe('1');
  await study.run();
  await flushPromises();
  expect((selector.element as HTMLSelectElement).value).toBe('0');
  study.mode = 'shift';
  study.shift.epochs = 5;
  study.shift.severity = 0;
  await study.run();
  await flushPromises();
  expect(wrapper.text()).toContain('El mismo modelo ante datos distintos');
  expect(study.shiftResult!.delta.loss).toBe(0);
  RuntimeWorkerDouble.deferData = true;
  const pending = study.run();
  await flushPromises();
  await router.push('/lab/experimentos');
  await pending;
  expect(study.busy).toBe(false);
  expect(study.shiftResult).toBeDefined();
  wrapper.unmount();
});
