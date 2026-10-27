import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { createPinia, setActivePinia, disposePinia, type Pinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { RuntimeWorkerDouble } from '../fixtures/runtime-worker';
import { useVisionStore } from '@/stores/vision';
import VisionPage from '@/features/vision/VisionPage.vue';
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
});
it('borrador separado, copia registrada, selección, cancelación y errores', async () => {
  const s = useVisionStore();
  expect(() => s.report()).toThrow();
  s.paint(0, 0, 0.5);
  expect(s.options.pixels[0]).toBe(0.5);
  s.paint(-1, 0, 1);
  s.paint(0, 0, NaN);
  s.resize(9);
  expect(s.options.size).toBe(10);
  s.resize(14);
  s.pattern('cross');
  s.rotate();
  s.clear();
  expect(s.options.pixels.every((v) => v === 0)).toBe(true);
  s.kernel(5, 'mean');
  s.hypothesis = 'Conservar ceros';
  await s.run();
  expect(s.result!.raw.every((v) => v === 0)).toBe(true);
  const r = s.result;
  s.hypothesis = 'Borrador';
  s.paint(0, 0, 1);
  s.reflection = 'Comprobado';
  expect(JSON.parse(s.report()).hypothesis).toBe('Conservar ceros');
  expect(s.result!.input.pixels[0]).toBe(0);
  RuntimeWorkerDouble.deferData = true;
  const p = s.run();
  s.resize(28);
  s.paint(0, 0, 0);
  s.pattern('border');
  s.rotate();
  s.clear();
  s.kernel(3, 'identity');
  await s.run();
  expect(s.options.size).toBe(14);
  expect(s.options.pixels[0]).toBe(1);
  s.cancel();
  await p;
  expect(s.result).toBe(r);
  expect(s.notice).toContain('cancelado');
  RuntimeWorkerDouble.deferData = false;
  s.options.stride = 9;
  await s.run();
  expect(s.error).toContain('No se completó');
  expect(s.result).toBe(r);
});
it('vista con productos reales, presets, edición, reproducción manual y navegación', async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: VisionPage },
      { path: '/other', component: { template: '<p>Otra</p>' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount({ template: '<RouterView/>' }, { global: { plugins: [pinia, router] } });
  await flushPromises();
  const s = useVisionStore(),
    button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)!;
  await button('Pintar píxel').trigger('click');
  expect(s.options.pixels[0]).toBe(1);
  await button('Cruz').trigger('click');
  await button('Rotar imagen 90°').trigger('click');
  await button('Borrar imagen').trigger('click');
  await button('Filtro identidad').trigger('click');
  await wrapper.get('input[aria-label="Peso del kernel 0,0"]').setValue('1,5');
  expect(s.options.kernel[0]).toBe(1.5);
  await wrapper.get('input[aria-label="Peso del kernel 0,0"]').setValue('9');
  expect(wrapper.get('[role=alert]').text()).toContain('conserva');
  await s.run();
  await flushPromises();
  expect(wrapper.get('table').findAll('tbody tr')).toHaveLength(9);
  await button('Ventana siguiente').trigger('click');
  expect(s.index).toBe(1);
  await button('Ventana anterior').trigger('click');
  expect(s.index).toBe(0);
  expect(wrapper.get('[data-testid=vision-sum]').text()).toContain('z = 0');
  RuntimeWorkerDouble.deferData = true;
  const pending = s.run();
  await router.push('/other');
  await pending;
  expect(s.busy).toBe(false);
  wrapper.unmount();
});
