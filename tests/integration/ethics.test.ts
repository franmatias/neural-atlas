import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { Blob as NativeBlob } from 'node:buffer';
import { RuntimeWorkerDouble } from '../fixtures/runtime-worker';
import { trainingFixture } from '../fixtures/training';
import { useEthicsStore } from '@/stores/ethics';
import { useDatasetsStore } from '@/stores/datasets';
import { useTrainingStore } from '@/stores/training';
import EthicsPage from '@/features/ethics/EthicsPage.vue';
import AuditDistribution from '@/features/ethics/AuditDistribution.vue';
import { hashValue } from '@/domain/data/integrity';
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
      { path: '/ethics', component: EthicsPage },
      { path: '/lab/clasificacion', component: { template: '<div>Clasificación</div>' } },
    ],
  });
  await router.push('/ethics');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, router };
}
it('cohorte aislada de un entrenamiento ya iniciado; políticas y costes no modifican filas', async () => {
  const data = useDatasetsStore(),
    training = useTrainingStore(),
    study = useEthicsStore(),
    f = trainingFixture('moons', 200);
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  training.config = structuredClone(f.config);
  await flushPromises();
  training.unstableAccepted = true;
  training.initialize();
  await flushPromises();
  training.command('STEP_BATCH');
  await flushPromises();
  const before = training.state,
    dataset = data.dataset;
  expect(before?.updates).toBe(1);
  expect(() => study.report()).toThrow('NO_RESULT');
  study.hypothesis = 'El promedio puede ocultar diferencias.';
  await study.generate();
  const rows = hashValue(study.cohort!.rows);
  study.settings.alternative = 0.3;
  study.separate(true);
  expect(study.settings.group1).toBe(0.3);
  expect(study.settings.group2).toBe(0.3);
  study.settings.group2 = 0.6;
  study.settings.costs.G2.fn = 12;
  expect(study.analysis!.thresholds.alternative).toEqual({ G1: 0.3, G2: 0.6 });
  study.separate(false);
  expect(study.analysis!.thresholds.alternative).toEqual({ G1: 0.3, G2: 0.3 });
  study.options.seed = 99;
  study.hypothesis = 'Borrador posterior';
  const report = JSON.parse(study.report());
  expect(report.options.seed).toBe(42);
  expect(report.hypothesis).toBe('El promedio puede ocultar diferencias.');
  expect(hashValue(study.cohort!.rows)).toBe(rows);
  expect(training.state).toBe(before);
  expect(data.dataset).toBe(dataset);
  study.preset('bad');
  expect(study.options.seed).toBe(99);
});
it('cancelación, respuestas tardías y configuración inválida conservan la última cohorte', async () => {
  const { wrapper, router } = await render(),
    study = useEthicsStore();
  await study.generate();
  await flushPromises();
  const previous = study.cohort;
  RuntimeWorkerDouble.deferData = true;
  const pending = study.generate(),
    port = RaceWorker.latest;
  await study.generate();
  expect(RaceWorker.latest).toBe(port);
  study.preset('absent');
  expect(study.presetId).toBe('aggregate');
  study.cancel();
  await pending;
  port.onmessage?.({
    data: {
      id: port.id,
      ok: true,
      result: { ...previous, options: { ...previous!.options, seed: 99 } },
    },
  } as MessageEvent);
  expect(study.cohort).toBe(previous);
  expect(study.busy).toBe(false);
  expect(port.terminated).toBe(true);
  const leaving = study.generate();
  await flushPromises();
  await router.push('/lab/clasificacion');
  await leaving;
  expect(study.cohort).toBe(previous);
  expect(study.busy).toBe(false);
  RuntimeWorkerDouble.deferData = false;
  study.options.count1 = 0;
  study.options.count2 = 0;
  await study.generate();
  expect(study.error).toContain('al menos 20');
  expect(study.cohort).toBe(previous);
  wrapper.unmount();
});
it('interfaz muestra ausencia, denominadores, histogramas comunes y filtros de decisiones', async () => {
  const { wrapper } = await render(),
    study = useEthicsStore();
  study.preset('absent');
  await study.generate();
  await flushPromises();
  expect(wrapper.text()).toContain('Sin representación');
  expect(wrapper.text()).toContain('No definida (0/0)');
  const distributions = wrapper.findAllComponents(AuditDistribution);
  expect(distributions).toHaveLength(2);
  expect(distributions[0]!.props('maximum')).toBe(distributions[1]!.props('maximum'));
  study.preset('noPositives');
  await study.generate();
  await flushPromises();
  expect(study.analysis!.reference.groups.G2.recall).toBe(null);
  study.preset('noNegatives');
  await study.generate();
  await flushPromises();
  expect(study.analysis!.reference.groups.G2.fpr).toBe(null);
  study.preset('aggregate');
  await study.generate();
  study.settings.alternative = 0;
  await flushPromises();
  const table = () =>
    wrapper
      .findAll('table')
      .find((t) => t.get('caption').text() === 'Decisiones sobre las mismas filas de auditoría')!;
  for (const filter of ['all', 'changed', 'fp', 'fn']) {
    await wrapper.get('select[aria-label="Filtrar decisiones de auditoría"]').setValue(filter);
    const expected = study.analysis!.changes.filter(
      (r) =>
        filter === 'all' ||
        (filter === 'changed' && r.reference !== r.alternative) ||
        (filter === 'fp' && r.actual === 0 && r.alternative === 1) ||
        (filter === 'fn' && r.actual === 1 && r.alternative === 0),
    );
    expect(table().findAll('tbody tr')).toHaveLength(Math.min(20, expected.length));
  }
  await wrapper.get('select[aria-label="Filtrar decisiones de auditoría"]').setValue('all');
  await wrapper.get('select[aria-label="Canal de las filas auditadas"]').setValue('G2');
  expect(table().findAll('tbody tr')).toHaveLength(20);
  expect(table().text()).not.toContain('audit-G1-');
  wrapper.unmount();
});
it('exporta evidencia y reflexión, y conserva los datos si falla la descarga', async () => {
  const { wrapper } = await render(),
    study = useEthicsStore();
  study.hypothesis = 'Revisar el soporte.';
  await study.generate();
  await flushPromises();
  await wrapper
    .get('textarea[aria-label="Reflexión sobre evidencia"]')
    .setValue('El canal pequeño concentra FN.');
  await wrapper
    .get('textarea[aria-label="Reflexión sobre contexto"]')
    .setValue('Faltan subgrupos y validez de etiquetas.');
  await wrapper
    .get('textarea[aria-label="Reflexión sobre propuesta"]')
    .setValue('Participación y seguimiento.');
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
  const button = wrapper
    .findAll('button')
    .find((b) => b.text() === 'Exportar informe de ética y grupos')!;
  await button.trigger('click');
  const report = JSON.parse(await blobs[0]!.text());
  expect(report).toMatchObject({
    hypothesis: 'Revisar el soporte.',
    reflection: {
      evidence: 'El canal pequeño concentra FN.',
      context: 'Faltan subgrupos y validez de etiquetas.',
      action: 'Participación y seguimiento.',
    },
  });
  expect(report.limitations).toContain('No policy is automatically recommended or optimized');
  await vi.runOnlyPendingTimersAsync();
  vi.stubGlobal('URL', {
    createObjectURL: () => {
      throw new Error('denied');
    },
  });
  await button.trigger('click');
  expect(wrapper.text()).toContain('No se pudo exportar el informe');
  expect(study.cohort).toBeDefined();
  wrapper.unmount();
});
