import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { defineComponent, ref, nextTick } from 'vue';
import { Blob as NativeBlob } from 'node:buffer';
import { RuntimeWorkerDouble } from '../fixtures/runtime-worker';
import { useFunctionsStore } from '@/stores/functions';
import { useDatasetsStore } from '@/stores/datasets';
import { useTrainingStore } from '@/stores/training';
import { usePreferencesStore } from '@/stores/preferences';
import { useSnapshotPlayback } from '@/features/functions/useSnapshotPlayback';
import FunctionsPage from '@/features/functions/FunctionsPage.vue';
import FunctionPlot from '@/features/functions/FunctionPlot.vue';
import { hashValue } from '@/domain/data/integrity';
import { trainingFixture } from '../fixtures/training';
let pinia: Pinia;
class RaceWorker extends RuntimeWorkerDouble {
  static latest: RaceWorker;
  id = 0;
  constructor() {
    super();
    RaceWorker.latest = this;
  }
  override postMessage(raw: unknown) {
    this.id = (raw as { id: number }).id;
    super.postMessage(raw);
  }
}
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  RuntimeWorkerDouble.deferData = false;
  vi.stubGlobal('Worker', RaceWorker);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  disposePinia(pinia);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lab/regresion/funciones', component: FunctionsPage },
      { path: '/lab/regresion', component: { template: '<div>Regresión</div>' } },
      { path: '/away', component: { template: '<div>Otra página</div>' } },
    ],
  });
  await router.push('/lab/regresion/funciones');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, router };
}
it('estudio aislado, opciones registradas, cancelación y respuesta tardía conservan el resultado', async () => {
  const data = useDatasetsStore(),
    training = useTrainingStore(),
    study = useFunctionsStore();
  const fixture = trainingFixture('moons', 200);
  data.replace(fixture.dataset, fixture.split);
  data.prepared = fixture.prepared;
  training.config = structuredClone(fixture.config);
  await flushPromises();
  training.unstableAccepted = true;
  training.initialize();
  await flushPromises();
  training.command('STEP_BATCH');
  await flushPromises();
  const before = data.dataset,
    beforeState = training.state;
  expect(beforeState?.updates).toBe(1);
  expect(() => study.report()).toThrow('NO_RESULT');
  study.options.epochs = 5;
  study.options.width = 2;
  study.options.hypothesis = 'Dos curvas no aseguran causalidad.';
  await study.run();
  expect(study.result?.runs).toHaveLength(1);
  expect(data.dataset).toBe(before);
  expect(training.state).toBe(beforeState);
  study.options.kind = 'step';
  study.options.epochs = 10;
  study.reflection = 'La suma coincide.';
  expect(JSON.parse(study.report())).toMatchObject({
    options: { kind: 'sine', epochs: 5 },
    reflection: 'La suma coincide.',
  });
  const previous = study.result;
  RuntimeWorkerDouble.deferData = true;
  const pending = study.run(),
    port = RaceWorker.latest;
  await study.run();
  expect(RaceWorker.latest).toBe(port);
  expect(study.busy).toBe(true);
  study.cancel();
  await pending;
  port.onmessage?.({
    data: {
      id: port.id,
      ok: true,
      result: { ...previous, options: { ...previous!.options, kind: 'step' } },
    },
  } as MessageEvent);
  expect(study.result).toBe(previous);
  expect(study.busy).toBe(false);
  expect(port.terminated).toBe(true);
  RuntimeWorkerDouble.deferData = false;
  study.options.epochs = 0;
  await study.run();
  expect(study.error).toContain('No se completó');
  expect(study.result).toBe(previous);
  study.selectRun(-1);
  expect(study.runIndex).toBe(0);
});
it('página inspecciona x, términos y épocas reales; abandonar cancela conservando evidencia', async () => {
  const { wrapper, router } = await render(),
    study = useFunctionsStore();
  study.options.epochs = 5;
  study.options.compare = true;
  await study.run();
  await flushPromises();
  const svg = wrapper.findComponent(FunctionPlot).get('svg');
  await svg.trigger('keydown', { key: 'ArrowRight' });
  expect(study.probe).toBe(0.01);
  await svg.trigger('keydown', { key: 'ArrowLeft' });
  expect(study.probe).toBe(0);
  await svg.trigger('keydown', { key: 'Home' });
  expect(study.probe).toBe(-1);
  await svg.trigger('keydown', { key: 'End' });
  expect(study.probe).toBe(1);
  await svg.trigger('keydown', { key: 'a' });
  expect(study.probe).toBe(1);
  await svg.trigger('pointerup', { clientX: 360 });
  expect(study.probe).toBe(1);
  vi.spyOn(svg.element, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 720,
  } as DOMRect);
  await svg.trigger('pointerup', { clientX: 380 });
  expect(study.probe).toBe(0);
  const original = hashValue(study.result!.runs.map((r) => r.snapshots.map((s) => s.curve)));
  await wrapper.get('input[aria-label="Instantánea de entrenamiento"]').setValue('1');
  expect(wrapper.get('[data-testid="function-snapshot"]').text()).toContain('Época 1');
  const buttons = () => wrapper.findAll('button');
  await buttons()
    .find((b) => b.text() === 'Instantánea anterior')!
    .trigger('click');
  await buttons()
    .find((b) => b.text() === 'Instantánea siguiente')!
    .trigger('click');
  await wrapper.get('select[aria-label="Red de aproximación inspeccionada"]').setValue('3');
  expect(wrapper.findAll('table')[0]!.findAll('tbody tr')).toHaveLength(32);
  await wrapper.get('select[aria-label="Neurona de contribución"]').setValue('31');
  expect(study.neuron).toBe(31);
  expect(original).toBe(hashValue(study.result!.runs.map((r) => r.snapshots.map((s) => s.curve))));
  RuntimeWorkerDouble.deferData = true;
  const pending = study.run();
  await flushPromises();
  await router.push('/away');
  await pending;
  expect(study.busy).toBe(false);
  expect(study.result).toBeDefined();
  wrapper.unmount();
});
it('reproducción usa instantáneas, velocidad, pausa, visibilidad, reducción de movimiento y desmontaje', async () => {
  vi.useFakeTimers();
  const index = ref(2),
    count = ref(3),
    prefs = usePreferencesStore();
  let playback!: ReturnType<typeof useSnapshotPlayback>;
  const wrapper = mount(
    defineComponent({
      setup() {
        playback = useSnapshotPlayback(index, count);
        return () => 'Playback';
      },
    }),
  );
  playback.toggle();
  expect(index.value).toBe(0);
  await vi.advanceTimersByTimeAsync(900);
  expect(index.value).toBe(1);
  prefs.update({ speed: 2 });
  await nextTick();
  await vi.advanceTimersByTimeAsync(450);
  expect(index.value).toBe(2);
  expect(playback.playing.value).toBe(false);
  playback.toggle();
  playback.toggle();
  expect(playback.playing.value).toBe(false);
  count.value = 1;
  await nextTick();
  playback.toggle();
  expect(playback.playing.value).toBe(false);
  count.value = 5;
  await nextTick();
  playback.toggle();
  prefs.update({ motion: 'reduced' });
  await nextTick();
  expect(playback.playing.value).toBe(false);
  playback.toggle();
  expect(playback.playing.value).toBe(false);
  prefs.update({ motion: 'system' });
  await nextTick();
  playback.toggle();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(playback.playing.value).toBe(false);
  playback.toggle();
  expect(playback.playing.value).toBe(false);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  document.dispatchEvent(new Event('visibilitychange'));
  playback.toggle();
  wrapper.unmount();
  const last = index.value;
  await vi.advanceTimersByTimeAsync(2000);
  expect(index.value).toBe(last);
});
it('exportación de vista incluye selección/reflexión y conserva resultados cuando se deniega descarga', async () => {
  const { wrapper } = await render(),
    study = useFunctionsStore();
  study.options.epochs = 5;
  await study.run();
  await flushPromises();
  vi.useFakeTimers();
  const blobs: Blob[] = [];
  vi.stubGlobal('Blob', NativeBlob);
  vi.stubGlobal('URL', {
    createObjectURL: (b: Blob) => {
      blobs.push(b);
      return 'blob:report';
    },
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  study.reflection = 'La rejilla limpia no es test.';
  const button = wrapper
    .findAll('button')
    .find((b) => b.text() === 'Exportar informe de aproximación')!;
  await button.trigger('click');
  expect(JSON.parse(await blobs[0]!.text())).toMatchObject({
    reflection: study.reflection,
    selection: { snapshot: 5 },
  });
  await vi.runOnlyPendingTimersAsync();
  vi.stubGlobal('URL', {
    createObjectURL: () => {
      throw new Error('denied');
    },
  });
  await button.trigger('click');
  expect(wrapper.text()).toContain('No se pudo exportar el informe');
  expect(study.result).toBeDefined();
  wrapper.unmount();
});
