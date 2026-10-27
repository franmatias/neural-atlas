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
  it('salta a extremos, cambia el tamaño y no deja páginas vacías al filtrar', async () => {
    const { wrapper } = await render();
    expect(wrapper.findAll('.glossary-pagination')).toHaveLength(2);
    expect(wrapper.findAll('.glossary-pagination [aria-current="page"]')).toHaveLength(2);
    await wrapper.get('[aria-label="Ir a la página 28"]').trigger('click');
    expect(wrapper.findAll('.concept-card')).toHaveLength(4);
    expect(wrapper.get('[role=status]').text()).toContain('649–652 de 652');
    expect(
      wrapper
        .get('.glossary-pagination .pagination-direction:last-child button:first-child')
        .attributes('disabled'),
    ).toBeDefined();
    await wrapper.get('#concept-page-size').setValue('96');
    expect(wrapper.findAll('.concept-card')).toHaveLength(96);
    expect(wrapper.get('[role=status]').text()).toContain('Página 1 de 7');
    await wrapper.get('[aria-label="Ir a la página 7"]').trigger('click');
    expect(wrapper.findAll('.concept-card')).toHaveLength(76);
    await wrapper.get('input[type=search]').setValue('C652');
    expect(wrapper.findAll('.glossary-pagination')).toHaveLength(0);
    expect(wrapper.findAll('.concept-card')).toHaveLength(1);
    await wrapper.get('input[type=search]').setValue('ningun-concepto-coincide-12345');
    expect(wrapper.get('[role=status]').text()).toContain('0–0 de 0');
    expect(wrapper.findAll('.glossary-pagination')).toHaveLength(0);
  });
  it('pagina 652 fichas y combina filtros sin perder la primera página', async () => {
    const { wrapper } = await render();
    expect(wrapper.findAll('.concept-card')).toHaveLength(24);
    expect(wrapper.get('[role=status]').text()).toContain('652');
    await wrapper
      .get('.glossary-pagination .pagination-direction:last-child button:first-child')
      .trigger('click');
    expect(wrapper.get('[role=status]').text()).toContain('Página 2');
    await wrapper
      .get('.glossary-pagination .pagination-direction:first-child button:last-child')
      .trigger('click');
    await wrapper.get('#concept-kind').setValue('reference');
    expect(wrapper.get('[role=status]').text()).toContain('501');
    await wrapper.get('#concept-topic').setValue('attention');
    expect(wrapper.get('[role=status]').text()).toContain('25 conceptos');
    await wrapper
      .get('.glossary-pagination .pagination-direction:last-child button:first-child')
      .trigger('click');
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
    expect(wrapper.get('[role=status]').text()).toContain('151');
    await wrapper.get('#concept-topic').setValue('attention');
    expect(wrapper.find('.empty-state').exists()).toBe(true);
  });
});
