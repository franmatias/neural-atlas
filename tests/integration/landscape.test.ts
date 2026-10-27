import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { RuntimeWorkerDouble } from '../fixtures/runtime-worker';
import { useLandscapeStore } from '@/stores/landscape';
import { usePreferencesStore } from '@/stores/preferences';
import LandscapePage from '@/features/landscape/LandscapePage.vue';
import { trainingFixture } from '../fixtures/training';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
let pinia: Pinia;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal('Worker', RuntimeWorkerDouble);
  RuntimeWorkerDouble.deferData = false;
});
afterEach(() => {
  disposePinia(pinia);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: LandscapePage },
      { path: '/other', component: { template: '<p>Otra</p>' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, router };
}
it('Worker, corte real aislado, informe y conservación de resultados con cancelación/error', async () => {
  const study = useLandscapeStore();
  expect(() => study.report()).toThrow('NO_RESULT');
  study.center();
  study.example();
  expect(study.entries).toHaveLength(2);
  expect(study.options.start).toEqual([0, 0]);
  await study.run();
  expect(study.result!.grid.values).toHaveLength(625);
  expect(JSON.parse(study.report()).provenance.samples.ids).toHaveLength(3);
  const before = study.result;
  RuntimeWorkerDouble.deferData = true;
  const pending = study.run();
  expect(study.busy).toBe(true);
  study.example();
  await study.run();
  study.cancel();
  await pending;
  expect(study.result).toBe(before);
  expect(study.notice).toContain('cancelado');
  RuntimeWorkerDouble.deferData = false;
  study.options.axes = [0, 0];
  await study.run();
  expect(study.error).toContain('ejes distintos');
  expect(study.result).toBe(before);
});
it('vista, contornos, reproducción, captura de sesión y navegación cancelable', async () => {
  const f = trainingFixture('moons', 200),
    data = useDatasetsStore(),
    training = useTrainingStore();
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  training.config = structuredClone(f.config);
  await flushPromises();
  training.unstableAccepted = true;
  training.initialize();
  await flushPromises();
  training.command('STEP_BATCH');
  await flushPromises();
  const original = training.state;
  const { wrapper, router } = await render(),
    study = useLandscapeStore();
  await study.run();
  await flushPromises();
  expect(wrapper.findAll('polyline')).toHaveLength(4);
  expect(wrapper.get('table').text()).toContain('sgd');
  expect(wrapper.get('h1').text()).toContain('Cuatro caminos');
  await wrapper.get('button[aria-pressed="true"]').trigger('click');
  const buttons = () => wrapper.findAll('button');
  await buttons()
    .find((b) => b.text() === 'Paso siguiente')!
    .trigger('click');
  expect(study.index).toBe(1);
  await buttons()
    .find((b) => b.text() === 'Paso anterior')!
    .trigger('click');
  expect(study.index).toBe(0);
  vi.useFakeTimers();
  await buttons()
    .find((b) => b.text() === 'Reproducir trayectoria')!
    .trigger('click');
  await vi.advanceTimersByTimeAsync(1000);
  expect(study.index).toBeGreaterThan(0);
  usePreferencesStore().update({ motion: 'reduced' });
  await flushPromises();
  expect(
    buttons()
      .find((b) => b.text() === 'Reproducir trayectoria')!
      .attributes('disabled'),
  ).toBeDefined();
  vi.useRealTimers();
  study.options.mode = 'frozen';
  await flushPromises();
  await buttons()
    .find((b) => b.text() === 'Congelar copia de sesión L06')!
    .trigger('click');
  expect(study.frozen!.samples.ids.every((id) => training.input!.train.ids.includes(id))).toBe(
    true,
  );
  expect(study.frozen!.samples.ids).toHaveLength(64);
  expect(training.state).toBe(original);
  study.options.resolution = 10;
  study.options.steps = 2;
  await study.run();
  expect(study.error).toBe('');
  expect(training.state).toBe(original);
  RuntimeWorkerDouble.deferData = true;
  const pending = study.run();
  await router.push('/other');
  await pending;
  expect(study.busy).toBe(false);
  wrapper.unmount();
});
