import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { TrainingRuntime } from '@/application/training/runtime';
import { handleDataJob, type DataJob } from '@/application/data/jobs';
import { useTrainingStore } from '@/stores/training';
import { useDatasetsStore } from '@/stores/datasets';
import { trainingFixture } from '../fixtures/training';
import TrainingPage from '@/features/training/TrainingPage.vue';
import EvaluationPage from '@/features/training/EvaluationPage.vue';
import { trainingError } from '@/features/training/messages';
class WorkerDouble {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;
  runtime: TrainingRuntime;
  constructor() {
    this.runtime = new TrainingRuntime({
      now: () => performance.now(),
      schedule: (callback, delay) => {
        if (delay)
          setTimeout(() => {
            if (!this.terminated) callback();
          }, delay);
        else
          queueMicrotask(() => {
            if (!this.terminated) callback();
          });
      },
      send: (event) =>
        queueMicrotask(() => {
          if (!this.terminated) this.onmessage?.({ data: structuredClone(event) } as MessageEvent);
        }),
    });
  }
  postMessage(raw: unknown) {
    const command = structuredClone(raw) as { id: number; job?: DataJob };
    queueMicrotask(() => {
      if (this.terminated) return;
      if (command.job)
        this.onmessage?.({ data: handleDataJob(command.id, command.job) } as MessageEvent);
      else this.runtime.receive(command);
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
  document.body.innerHTML = '';
});
async function render(recipe: 'moons' | 'flowers' | 'sine' = 'moons') {
  const data = useDatasetsStore(),
    fixture = trainingFixture(recipe);
  data.replace(fixture.dataset, fixture.split);
  data.prepared = fixture.prepared;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/lab/entrenamiento', component: TrainingPage },
      { path: '/lab/clasificacion', component: EvaluationPage, props: { mode: 'classification' } },
      { path: '/lab/regresion', component: EvaluationPage, props: { mode: 'regression' } },
      { path: '/lab/datos', component: { template: '<div>Datos</div>' } },
      { path: '/lab/arquitectura', component: { template: '<div>Arquitectura</div>' } },
    ],
  });
  await router.push('/lab/entrenamiento');
  await router.isReady();
  const wrapper = mount(
    { template: '<RouterView/>' },
    { attachTo: document.body, global: { plugins: [pinia, router] } },
  );
  await flushPromises();
  const session = useTrainingStore();
  session.config.epochs = 3;
  session.config.batchSize = 8;
  return { wrapper, router, session, data };
}
describe('D4: interfaz, datos y motor real con transporte controlado', () => {
  it('D5: captura y restaura una sesión nueva sin ejecutar automáticamente y preserva test congelado', async () => {
    const { session } = await render();
    expect(() => session.capture()).toThrow('EXPERIMENT_BUSY');
    session.initialize();
    await flushPromises();
    session.command('STEP_BATCH');
    await flushPromises();
    const saved = session.capture();
    expect(saved.checkpoint.updates).toBe(1);
    session.command('STEP_BATCH');
    await flushPromises();
    const expected = session.capture();
    await session.restore(saved);
    await flushPromises();
    expect(session.state?.updates).toBe(1);
    expect(session.running).toBe(false);
    session.command('STEP_BATCH');
    await flushPromises();
    expect(session.state).toEqual(expected.checkpoint);
    session.freezeAndTest();
    await flushPromises();
    const frozen = session.capture();
    await session.restore(frozen);
    await flushPromises();
    expect(session.state?.frozen).toBe(true);
    expect(session.consulted).toBe(true);
    expect(session.status).toBe('frozen');
    await session.restore(saved);
    await flushPromises();
    expect(session.state?.frozen).toBe(false);
    expect(session.consulted).toBe(true); // An older file cannot erase a known consultation.
  });
  it('reconoce presupuestos amplios y pausa al ocultar o abandonar el laboratorio', async () => {
    const { session, router } = await render();
    session.config.spec.hidden = [64, 64, 64, 64, 64, 64];
    session.config.epochs = 1000;
    session.initialize();
    expect(session.error).toBe('BUDGET');
    session.budgetAccepted = true;
    session.initialize();
    await flushPromises();
    expect(session.status).toBe('ready');
    session.status = 'running';
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(session.status).toBe('paused');
    expect(session.notice).toContain('ocultar');
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    session.status = 'running';
    await router.push('/lab/clasificacion');
    await flushPromises();
    expect(session.status).toBe('paused');
    expect(session.notice).toContain('cambiar de laboratorio');
  });
  it('entrena, evalúa, inspecciona confusión, predice y respeta la congelación', async () => {
    const { wrapper, router, session, data } = await render();
    const fields = wrapper.findAll('.training-controls input');
    await fields[0]!.setValue('4, 3');
    expect(session.config.spec.hidden).toEqual([4, 3]);
    await fields[0]!.setValue('');
    expect(session.config.spec.hidden).toEqual([]);
    await fields[0]!.setValue('4');
    session.initialize();
    await flushPromises();
    expect(session.status).toBe('ready');
    expect(wrapper.find('.loss-chart').exists()).toBe(true);
    session.command('STEP_BATCH');
    await flushPromises();
    expect(session.state?.updates).toBe(1);
    session.command('STEP_EPOCH');
    await flushPromises();
    expect(session.state?.epoch).toBe(1);
    session.command('RUN');
    await flushPromises();
    expect(session.status).toBe('completed');
    await router.push('/lab/clasificacion');
    await flushPromises();
    session.analyze('validation');
    await flushPromises();
    expect(session.evaluation?.kind).toBe('classification');
    expect(wrapper.text()).toContain('Resultados: validación');
    expect(wrapper.findAll('.confusion-table tbody tr')).toHaveLength(2);
    await wrapper.get('.confusion-table button').trigger('click');
    expect(wrapper.text()).toContain('muestras seleccionadas');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Mostrar todas las muestras')!
      .trigger('click');
    session.remember();
    await nextTick();
    expect(session.comparisons).toHaveLength(1);
    expect(wrapper.text()).toContain('MLP 4');
    session.analyze('train');
    await flushPromises();
    expect(wrapper.text()).toContain('Resultados: entrenamiento');
    session.analyze('test');
    expect(session.error).toBe('TEST_LOCKED');
    session.error = '';
    session.freezeAndTest();
    await flushPromises();
    expect(session.state?.frozen).toBe(true);
    expect(session.consulted).toBe(true);
    expect(wrapper.text()).toContain('Test ya ha sido consultado');
    session.predict(
      Object.fromEntries(data.prepared!.pipeline.columns.map((column) => [column.id, column.fill])),
    );
    await flushPromises();
    expect(session.prediction).toHaveLength(1);
    expect(wrapper.find('.prediction-result').text()).toContain('Clase');
    session.predict({});
    await flushPromises();
    expect(wrapper.text()).toContain('Predicción');
    session.reset();
    await router.push('/lab/entrenamiento');
    await flushPromises();
    expect(wrapper.text()).toContain('Configura tu experimento');
    expect(session.comparisons).toHaveLength(1);
    data.replace(data.dataset);
    await nextTick();
    expect(session.comparisons).toHaveLength(0);
    expect(session.state).toBeUndefined();
    session.initialize();
    expect(session.error).toBe('PREPARE_DATA');
  });
  it.each(['flowers', 'sine'] as const)(
    'métricas y predicción de %s conservan la tarea',
    async (recipe) => {
      const { wrapper, router, session } = await render(recipe);
      session.config.spec.hidden = [];
      session.config.loss = 'mae';
      if (recipe === 'flowers') {
        session.initialize();
        expect(session.error).toBe('LOW_SUPPORT');
        await wrapper.get('.training-check input').setValue(true);
      }
      session.initialize();
      await flushPromises();
      session.command('RUN');
      await flushPromises();
      await router.push(recipe === 'sine' ? '/lab/regresion' : '/lab/clasificacion');
      await flushPromises();
      session.analyze('validation');
      await flushPromises();
      expect(wrapper.text()).toContain('Resultados: validación');
      if (recipe === 'flowers') {
        expect(wrapper.findAll('.confusion-table tbody tr')).toHaveLength(3);
      } else {
        expect(wrapper.text()).toContain('R²');
        expect(wrapper.text()).toContain('mediana');
      }
      for (const field of wrapper.findAll('form input')) await field.setValue('999');
      await wrapper.get('form').trigger('submit');
      await flushPromises();
      expect(wrapper.text()).toContain('fuera del rango');
      expect(wrapper.find('.prediction-result').exists()).toBe(true);
      session.remember();
      session.freezeAndTest();
      await flushPromises();
      expect(session.analysis?.split).toBe('test');
    },
  );
  it('carga casos, controla errores y muestra mensajes honestos sin modelo compatible', async () => {
    const { wrapper, router, session, data } = await render();
    session.config.epochs = 0;
    session.initialize();
    expect(session.error).toBe('INVALID_CONFIG');
    session.config.epochs = 2;
    session.config.spec.hidden = [0];
    session.initialize();
    expect(session.error).toBe('ARCHITECTURE');
    session.config.spec.hidden = [4];
    await session.preset('flowers');
    await flushPromises();
    expect(data.dataset.task).toBe('multiclass');
    session.initialize();
    await flushPromises();
    session.command('CANCEL');
    await flushPromises();
    expect(session.status).toBe('cancelled');
    await router.push('/lab/regresion');
    await flushPromises();
    expect(wrapper.text()).toContain('Entrena un modelo para esta tarea');
    expect(trainingError('UNKNOWN')).toContain('No se pudo');
    session.reset();
    session.predict({});
    session.analyze('train');
    session.remember();
    expect(session.state).toBeUndefined();
  });
});
