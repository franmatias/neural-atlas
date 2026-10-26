import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { TrainingRuntime } from '@/application/training/runtime';
import { useDecisionSession } from '@/features/decision/useDecisionSession';
import VisualDecisionPage from '@/features/decision/VisualDecisionPage.vue';
class WorkerDouble {
  static instances: WorkerDouble[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror = null;
  terminated = false;
  runtime = new TrainingRuntime({
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
  constructor() {
    WorkerDouble.instances.push(this);
  }
  postMessage(command: unknown) {
    const copy = structuredClone(command);
    queueMicrotask(() => {
      if (!this.terminated) this.runtime.receive(copy);
    });
  }
  terminate() {
    this.terminated = true;
  }
}
beforeEach(() => {
  WorkerDouble.instances = [];
  vi.stubGlobal('Worker', WorkerDouble);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it.each(['binary', 'multiclass'] as const)(
  'sesión %s aislada: configuración pendiente, rechazo, pasos y limpieza del Worker',
  async (mode) => {
    let lab!: ReturnType<typeof useDecisionSession>;
    const wrapper = mount(
      defineComponent({
        setup() {
          lab = useDecisionSession(mode);
          return {};
        },
        template: '<div />',
      }),
    );
    await flushPromises();
    expect(lab.status).toBe('ready');
    const first = lab.study,
      worker = WorkerDouble.instances[0]!;
    lab.draft.rate = 0;
    lab.reset();
    expect(lab.error).toContain('No se han aplicado');
    expect(lab.study).toBe(first);
    expect(worker.terminated).toBe(false);
    lab.draft.rate = 0.03;
    expect(lab.dirty).toBe(true);
    lab.pace = 0;
    lab.command('STEP_BATCH');
    await flushPromises();
    expect(lab.state!.updates).toBe(1);
    expect(lab.study!.source.input.config.optimizer.rate).toBe(0.02);
    lab.command('STEP_EPOCH');
    await flushPromises();
    expect(lab.state!.epoch).toBe(1);
    lab.x = NaN;
    expect(lab.prediction).toBeUndefined();
    lab.addPoint();
    expect(lab.manual).toHaveLength(0);
    lab.x = 0.5;
    lab.addPoint();
    await flushPromises();
    expect(lab.state!.updates).toBe(0);
    expect(lab.manual).toHaveLength(1);
    expect(lab.study!.dataset.rows).toHaveLength(241);
    expect(worker.terminated).toBe(true);
    lab.reset(true);
    await flushPromises();
    expect(lab.manual).toHaveLength(0);
    expect(lab.study!.dataset.rows).toHaveLength(240);
    wrapper.unmount();
    expect(WorkerDouble.instances.every((w) => w.terminated)).toBe(true);
  },
);
it('la pantalla muestra el mismo checkpoint y permite inspección y explicaciones sin entrenar', async () => {
  const wrapper = mount(VisualDecisionPage, {
    props: { mode: 'multiclass' },
    global: { plugins: [createPinia()], stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
  await flushPromises();
  expect(wrapper.findAll('.probability-row')).toHaveLength(4);
  expect(wrapper.get('[data-testid=visual-epoch]').text()).toBe('0');
  const button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)!;
  await button('Rigor matemático').trigger('click');
  expect(wrapper.text()).toContain('Softmax usa');
  await button('Reto práctico').trigger('click');
  expect(wrapper.text()).toContain('Compara nubes y anillos');
  await wrapper.get('svg[role=group]').trigger('keydown', { key: 'ArrowLeft' });
  expect(
    (
      wrapper
        .findAll('label')
        .find((l) => l.text().startsWith('x₁ de prueba'))!
        .get('input').element as HTMLInputElement
    ).value,
  ).toBe('-0.05');
  await button('Un lote').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('Actualizaciones');
  expect(wrapper.find('.field-error').exists()).toBe(false);
  wrapper.unmount();
});
