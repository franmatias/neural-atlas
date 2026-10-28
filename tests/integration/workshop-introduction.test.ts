import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { effectScope, type EffectScope } from 'vue';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { RuntimeWorkerDouble } from '../fixtures/runtime-worker';
import { libraryPort } from '../fixtures/library-port';
import { trainingFixture } from '../fixtures/training';
import { useWorkshopIntroduction } from '@/features/workshops/useWorkshopIntroduction';
import WorkshopIntroductionPage from '@/features/workshops/WorkshopIntroductionPage.vue';
import { useWorkshopsStore } from '@/stores/workshops';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { initialSession } from '@/domain/training/session';
import { exhaust } from '@/domain/training/kernel';
import { downloadLearning } from '@/infrastructure/files/learning';
import { activeDataJobs } from '@/infrastructure/workers/data-client';
vi.mock('@/infrastructure/files/learning', () => ({ downloadLearning: vi.fn() }));
let pinia: Pinia;
const scopes: EffectScope[] = [];
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal('Worker', RuntimeWorkerDouble);
  vi.stubGlobal('indexedDB', libraryPort().factory);
  RuntimeWorkerDouble.deferData = false;
  vi.mocked(downloadLearning).mockReset();
});
afterEach(() => {
  scopes.splice(0).forEach((s) => s.stop());
  disposePinia(pinia);
  vi.unstubAllGlobals();
});
function controller() {
  const scope = effectScope();
  scopes.push(scope);
  return { scope, tour: scope.run(() => useWorkshopIntroduction())! };
}
function prepare(t: ReturnType<typeof useWorkshopIntroduction>) {
  t.prediction.value = 'rotate';
  expect(t.next()).toBe(true);
  expect(t.next()).toBe(true);
}
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/taller/ejemplo', component: WorkshopIntroductionPage },
      { path: '/taller', component: { template: '<h1>Catálogo</h1>' } },
    ],
  });
  await router.push('/taller/ejemplo');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const button = (text: string) => wrapper.findAll('button').find((b) => b.text() === text)!;
  return { wrapper, router, button };
}

it('progresión explícita, predicción incorrecta, resultado real y conclusión sin nota', async () => {
  const { tour: t } = controller();
  expect(t.next()).toBe(false);
  expect(t.go(-1)).toBe(false);
  expect(t.go(0.5)).toBe(false);
  expect(t.go(4)).toBe(false);
  expect(t.finish()).toBe(false);
  expect(() => t.report()).toThrow('NO_INTRODUCTION_EVIDENCE');
  expect(await t.run()).toBe(false);
  prepare(t);
  expect(t.next()).toBe(false);
  expect(await t.run()).toBe(true);
  expect(t.evidence.value!.metrics.distance).toBeCloseTo(1 / Math.sqrt(5), 12);
  expect(t.evidence.value!.metrics.sameWeights).toBe(true);
  expect(t.evidence.value!.plot).toHaveLength(40);
  expect(t.next()).toBe(true);
  expect(t.feedback.value).toContain('equivocarse');
  expect(t.next()).toBe(true);
  expect(t.finish()).toBe(true);
  expect(t.report()).toMatchObject({
    format: 'neural-atlas.workshop-demo',
    completed: true,
    learner: { prediction: 'rotate', reflection: '' },
    exampleSource: 'provided-worked-example',
  });
  t.hypothesis.value = 'Una idea propia';
  t.restart();
  expect(t.step.value).toBe(0);
  expect(t.hypothesis.value).toBe('Una idea propia');
  expect(t.completed.value).toBe(false);
  expect(t.evidence.value).toBeDefined();
});
it('la referencia no altera el sesgo, evidencia ni notas propias; cambiar ajustes obliga a recalcular', async () => {
  const { tour: t } = controller();
  prepare(t);
  t.bias.value = -0.5;
  expect(t.step.value).toBe(1);
  expect(t.unlocked.value).toBe(1);
  t.next();
  await t.run();
  const own = t.evidence.value;
  t.hypothesis.value = 'Mi hipótesis';
  t.reflection.value = 'Mi explicación';
  await t.showSolved();
  expect(t.mode.value).toBe('solved');
  expect(t.reference.value!.options.bias).toBe(0.5);
  expect(t.evidence.value).toBe(own);
  expect(t.bias.value).toBe(-0.5);
  expect(t.report().learner.reflection).toBe('Mi explicación');
  expect(t.report().mode).toBe('solved');
  expect(t.report().completed).toBe(false);
  t.showGuided();
  expect(t.displayed.value).toBe(own);
  t.next();
  t.next();
  t.finish();
  t.bias.value = 0;
  expect(t.completed.value).toBe(false);
  expect(t.evidence.value).toBeUndefined();
  expect(t.step.value).toBe(1);
  expect(t.go(3)).toBe(false);
  t.prediction.value = 'same';
  t.next();
  await t.run();
  expect(t.evidence.value!.metrics.distance).toBe(0);
  expect(t.feedback.value).toContain('coincide');
  t.prediction.value = 'shift';
  expect(t.feedback.value).toContain('b=0');
  t.bias.value = 1;
  t.next();
  await t.run();
  t.prediction.value = 'shift';
  expect(t.feedback.value).toContain('coincide');
  expect(t.evidence.value!.metrics.distance).toBeCloseTo(2 / Math.sqrt(5), 12);
});
it('cancelar, cambiar configuración o salir impide publicar un resultado pendiente', async () => {
  const { tour: t, scope } = controller();
  prepare(t);
  RuntimeWorkerDouble.deferData = true;
  const pending = t.run();
  expect(t.busy.value).toBe(true);
  expect(activeDataJobs()).toBe(1);
  expect(t.go(0)).toBe(false);
  expect(t.next()).toBe(false);
  expect(await t.run()).toBe(false);
  await t.showSolved();
  t.showGuided();
  t.restart();
  expect(t.step.value).toBe(2);
  expect(t.finish()).toBe(false);
  t.cancel();
  expect(await pending).toBe(false);
  expect(t.evidence.value).toBeUndefined();
  expect(activeDataJobs()).toBe(0);
  expect(t.notice.value).toContain('cancelado');
  const changing = t.run();
  t.bias.value = 0.2;
  expect(await changing).toBe(false);
  expect(t.step.value).toBe(1);
  expect(t.evidence.value).toBeUndefined();
  t.next();
  const leaving = t.run();
  scope.stop();
  expect(await leaving).toBe(false);
  expect(activeDataJobs()).toBe(0);
});
it('errores conservan el resultado anterior y el reintento funciona; configuraciones inválidas no se ejecutan', async () => {
  const { tour: t } = controller();
  prepare(t);
  await t.run();
  const previous = t.evidence.value;
  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        throw Error('unavailable');
      }
    },
  );
  expect(await t.run()).toBe(false);
  expect(t.error.value).toContain('reintentarlo');
  expect(t.evidence.value).toBe(previous);
  vi.stubGlobal('Worker', RuntimeWorkerDouble);
  expect(await t.run()).toBe(true);
  expect(t.error.value).toBe('');
  for (const value of [NaN, 2, -2]) {
    t.bias.value = value;
    t.step.value = 2;
    expect(await t.run()).toBe(false);
    expect(t.error.value).toContain('entre −1 y 1');
  }
});
it('la interfaz recorre cinco fases, descarga notas propias y conserva los otros espacios de trabajo', async () => {
  const f = trainingFixture(),
    data = useDatasetsStore(),
    training = useTrainingStore(),
    workshop = useWorkshopsStore();
  data.replace(f.dataset, f.split);
  data.prepared = f.prepared;
  training.config = structuredClone(f.config);
  await flushPromises();
  training.input = f.input;
  training.state = exhaust(initialSession(f.input));
  workshop.progress.answers[workshop.definition.steps[0]!.id] = 'Texto previo del taller';
  const snapshot = () =>
    JSON.stringify({
      dataset: data.dataset,
      split: data.split,
      prepared: data.prepared,
      config: training.config,
      state: training.state,
      progress: workshop.progress,
    });
  const before = snapshot();
  const { wrapper: w, button } = await render();
  expect(button('Continuar ejemplo').attributes('disabled')).toBeDefined();
  expect(button('Descargar cuaderno del ejemplo').attributes('disabled')).toBeDefined();
  await w.get('input[value="rotate"]').setValue();
  await w.get('#intro-hypothesis').setValue('Esta es mi hipótesis');
  await button('Continuar ejemplo').trigger('click');
  expect(w.get('h2[tabindex]').text()).toContain('Configurar');
  await button('Continuar ejemplo').trigger('click');
  await button('Ejecutar mi ejemplo con el motor').trigger('click');
  await flushPromises();
  await button('Continuar ejemplo').trigger('click');
  expect(w.text()).toContain('equivocarse');
  expect(
    w.find('svg[aria-label="Frontera antes y después de cambiar solo el sesgo"]').exists(),
  ).toBe(true);
  await button('Continuar ejemplo').trigger('click');
  await w
    .get('#intro-reflection')
    .setValue('Pesos fijos y frontera desplazada; no implica mayor accuracy.');
  await button('Terminar recorrido de ejemplo').trigger('click');
  expect(w.text()).toContain('Recorrido de ejemplo terminado');
  await button('Descargar cuaderno del ejemplo').trigger('click');
  expect(downloadLearning).toHaveBeenCalledWith(
    expect.objectContaining({
      format: 'neural-atlas.workshop-demo',
      completed: true,
      learner: expect.objectContaining({ hypothesis: 'Esta es mi hipótesis' }),
    }),
    'neural-atlas-ejemplo-taller.json',
  );
  vi.mocked(downloadLearning).mockImplementationOnce(() => {
    throw Error();
  });
  await button('Descargar cuaderno del ejemplo').trigger('click');
  expect(w.get('[role=alert]').text()).toContain('No se pudo descargar');
  await button('Volver al primer paso y conservar mis notas').trigger('click');
  expect((w.get('#intro-hypothesis').element as HTMLTextAreaElement).value).toBe(
    'Esta es mi hipótesis',
  );
  expect(snapshot()).toBe(before);
});
it('la solución completa ofrece cinco respuestas y reintento sin rellenar el recorrido del alumno', async () => {
  vi.stubGlobal(
    'Worker',
    class {
      constructor() {
        throw Error('unavailable');
      }
    },
  );
  const { wrapper: w, button, router } = await render();
  await button('Ver ejemplo completo resuelto').trigger('click');
  await flushPromises();
  expect(w.get('[role=alert]').text()).toContain('No se pudo ejecutar');
  expect(w.findAll('.worked-list li')).toHaveLength(5);
  vi.stubGlobal('Worker', RuntimeWorkerDouble);
  await button('Calcular evidencia del ejemplo resuelto').trigger('click');
  await flushPromises();
  expect(w.find('.workshop-evidence').exists()).toBe(true);
  await button('Descargar cuaderno del ejemplo').trigger('click');
  expect(downloadLearning).toHaveBeenLastCalledWith(
    expect.objectContaining({
      mode: 'solved',
      completed: false,
      learner: expect.objectContaining({ hypothesis: '', reflection: '' }),
    }),
    expect.any(String),
  );
  await button('Probarlo con ayuda paso a paso').trigger('click');
  expect(button('Continuar ejemplo').attributes('disabled')).toBeDefined();
  await w.get('input[value="shift"]').setValue();
  await button('Continuar ejemplo').trigger('click');
  await button('Continuar ejemplo').trigger('click');
  RuntimeWorkerDouble.deferData = true;
  await button('Ejecutar mi ejemplo con el motor').trigger('click');
  await button('Cancelar cálculo del ejemplo').trigger('click');
  await flushPromises();
  expect(w.text()).toContain('Intento cancelado');
  await button('Ejecutar mi ejemplo con el motor').trigger('click');
  await router.push('/taller');
  await flushPromises();
  expect(w.get('h1').text()).toBe('Catálogo');
  expect(activeDataJobs()).toBe(0);
});
