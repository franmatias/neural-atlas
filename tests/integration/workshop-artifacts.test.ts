import { it, expect, vi, afterEach } from 'vitest';
import { createPinia, setActivePinia, disposePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { Blob as NativeBlob } from 'node:buffer';
import { runWorkshop } from '@/application/workshops/experiments';
import { defaultWorkshopOptions } from '@/application/workshops/contracts';
import { importExperiment } from '@/application/training/experiment';
import WorkshopEvidence from '@/features/workshops/WorkshopEvidence.vue';
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('artefacto validado descargable, nulos explícitos y rechazo de archivo corrupto sin perder evidencia', async () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  vi.stubGlobal('Blob', NativeBlob);
  let captured: NativeBlob | undefined;
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    captured = blob as unknown as NativeBlob;
    return 'blob:workshop';
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const evidence = runWorkshop('T08', {
    ...defaultWorkshopOptions,
    budgetAccepted: true,
    epochs: 5,
  });
  evidence.metrics.groupRecallGap = null;
  const wrapper = mount(WorkshopEvidence, { props: { evidence }, global: { plugins: [pinia] } });
  expect(wrapper.text()).toContain('No definida');
  expect(wrapper.text()).toContain('R² de validación');
  await wrapper.find('button').trigger('click');
  expect(importExperiment(await captured!.text()).checkpoint.epoch).toBe(5);
  await wrapper.setProps({ evidence: { ...evidence, experiment: '{}' } });
  await wrapper.find('button').trigger('click');
  await flushPromises();
  expect(wrapper.get('[role=alert]').text()).toContain('se pudo descargar');
  expect(wrapper.get('table').text()).toContain('Referencia válida');
  expect(evidence.experiment).not.toBe('{}');
  wrapper.unmount();
  disposePinia(pinia);
});
