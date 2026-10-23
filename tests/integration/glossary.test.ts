import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import GlossaryPage from '@/features/glossary/GlossaryPage.vue';
import { usePreferencesStore } from '@/stores/preferences';
let pinia: Pinia;
beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});
afterEach(() => disposePinia(pinia));
async function render(q?: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/glosario', component: GlossaryPage },
      { path: '/lab/:slug', component: { template: '<div>Laboratorio</div>' } },
    ],
  });
  await router.push({ path: '/glosario', query: q ? { q } : {} });
  await router.isReady();
  const wrapper = mount(GlossaryPage, {
    attachTo: document.body,
    global: { plugins: [pinia, router] },
  });
  await flushPromises();
  return { wrapper, router };
}
describe('catálogo grande accesible y filtrado', () => {
  it('pagina 569 fichas y combina filtros sin perder la primera página', async () => {
    const { wrapper } = await render();
    expect(wrapper.findAll('.concept-card')).toHaveLength(24);
    expect(wrapper.get('[role=status]').text()).toContain('569');
    await wrapper.get('.glossary-pagination button:last-child').trigger('click');
    expect(wrapper.get('[role=status]').text()).toContain('Página 2');
    await wrapper.get('.glossary-pagination button:first-child').trigger('click');
    await wrapper.get('#concept-kind').setValue('reference');
    expect(wrapper.get('[role=status]').text()).toContain('500');
    await wrapper.get('#concept-topic').setValue('attention');
    expect(wrapper.get('[role=status]').text()).toContain('25 conceptos');
    await wrapper.get('.glossary-pagination button:last-child').trigger('click');
    expect(wrapper.findAll('.concept-card')).toHaveLength(1);
    await wrapper.get('input[type=search]').setValue('key-value cache');
    expect(wrapper.findAll('.concept-card')).toHaveLength(1);
    expect(wrapper.get('[role=status]').text()).toContain('Página 1');
    expect(wrapper.get('.concept-card h2').text()).toBe('Caché de claves y valores');
  });
  it('distingue referencia, enlaces estables y laboratorios ya publicados', async () => {
    const { wrapper, router } = await render('C652');
    expect(wrapper.findAll('.concept-card')).toHaveLength(1);
    expect(wrapper.find('.concept-card a[href*="/lab/"]').exists()).toBe(false);
    usePreferencesStore().update({ level: 'formal' });
    await flushPromises();
    expect(wrapper.find('code').exists()).toBe(false);
    expect(wrapper.text()).toContain('Aún no incluye');
    await router.push('/glosario?q=C028');
    await flushPromises();
    expect(wrapper.get('.concept-card h2').text()).toBe('Sesgo');
    expect(wrapper.find('code').exists()).toBe(true);
    await wrapper.get('.concept-permalink').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.q).toBe('C028');
    await router.push('/glosario');
    await flushPromises();
    await wrapper.get('#concept-kind').setValue('interactive');
    expect(wrapper.get('[role=status]').text()).toContain('69');
    await wrapper.get('#concept-topic').setValue('attention');
    expect(wrapper.find('.empty-state').exists()).toBe(true);
  });
});
