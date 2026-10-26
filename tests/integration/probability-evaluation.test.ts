import { it, expect, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { Blob as NativeBlob } from 'node:buffer';
import ProbabilityEvaluation from '@/features/training/ProbabilityEvaluation.vue';
import ProbabilityChart from '@/features/training/ProbabilityChart.vue';
const props = () => ({
  actual: [0, 0, 1, 1],
  predictions: [[0.1], [0.6], [0.4], [0.9]],
  classOrder: ['No', 'Sí'],
  positive: 1,
  threshold: 0.5,
  split: 'validation' as const,
  update: 4,
  currentUpdate: 4,
  frozen: false,
  busy: false,
  consulted: false,
  source: {
    dataHash: 'datos',
    splitHash: 'partición',
    pipelineHash: 'pipeline',
    configHash: 'modelo',
  },
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('costes asimétricos seleccionan validación; bloquea test, train, congelado, consulta previa, ejecución y datos antiguos', async () => {
  const w = mount(ProbabilityEvaluation, { props: props() });
  await w.get('input[aria-label="Coste real Sí, predicha No"]').setValue('5');
  await w.get('input[aria-label="Coste real Sí, predicha No"]').trigger('change');
  const apply = w.findAll('button').find((b) => b.text().startsWith('Aplicar umbral'))!;
  await apply.trigger('click');
  expect(w.emitted('threshold')).toEqual([[0.4]]);
  const blocks = [
    { split: 'test' as const },
    { split: 'train' as const },
    { frozen: true },
    { consulted: true },
    { busy: true },
    { currentUpdate: 5 },
  ];
  for (const block of blocks) {
    await w.setProps({ ...props(), ...block });
    expect(apply.attributes('disabled')).toBeDefined();
    await apply.trigger('click');
    expect(w.emitted('threshold')).toHaveLength(1);
    expect(w.text()).not.toContain('Candidato de validación:');
  }
  await w.setProps(props());
  await w.get('input[aria-label="Coste real Sí, predicha No"]').setValue('-2');
  expect(w.get('[role="alert"]').text()).toContain('Se conserva el valor anterior');
  expect(w.get('input[aria-label="Coste real Sí, predicha No"]').element).toHaveProperty(
    'value',
    '5',
  );
  await w.get('input[aria-label="Coste real Sí, predicha No"]').setValue('2,5');
  await w.get('input[aria-label="Coste real Sí, predicha No"]').trigger('change');
  expect(w.find('[role="alert"]').exists()).toBe(false);
  expect(w.get('input[aria-label="Coste real Sí, predicha No"]').element).toHaveProperty(
    'value',
    '2.5',
  );
});
it('curvas e inspector reflejan clase positiva, bins, empates y casos sin positivos', async () => {
  const w = mount(ProbabilityEvaluation, { props: props() });
  expect(w.findAllComponents(ProbabilityChart)).toHaveLength(3);
  await w.get('input[aria-label="Recorrer umbrales de ranking"]').setValue('1');
  expect(w.get('.ranking-inspector').text()).toContain('TP 1 · FP 0');
  await w.setProps({ positive: 0 });
  expect(w.get('.ranking-inspector').text()).toContain('nadie positivo');
  await w.get('input[aria-label="Intervalos de fiabilidad"]').setValue('5');
  expect(w.findAll('table')[0]!.findAll('tbody tr')).toHaveLength(5);
  await w.setProps({ actual: [0, 0], predictions: [[0.3], [0.8]], positive: 1 });
  expect(w.get('[data-testid="probability-auc"]').text()).toBe('No definida');
  expect(w.get('[data-testid="probability-ap"]').text()).toBe('No definida');
  expect(w.findAllComponents(ProbabilityChart)[1]!.props('points')).toEqual([]);
  expect(w.text()).toContain('Sin positivos');
});
it('Softmax ofrece one-vs-rest y coste argmax sin ofrecer umbral global', async () => {
  const w = mount(ProbabilityEvaluation, {
    props: {
      ...props(),
      actual: [0, 1],
      predictions: [
        [0.7, 0.2, 0.1],
        [0.1, 0.8, 0.1],
      ],
      classOrder: ['A', 'B', 'C'],
    },
  });
  await w.get('select').setValue('2');
  expect(w.get('[data-testid="probability-ap"]').text()).toBe('No definida');
  expect(w.text()).toContain('2 clases definidas, 1 excluidas');
  expect(w.text()).toContain('mantiene argmax');
  expect(w.findAll('button').some((b) => b.text().startsWith('Aplicar umbral'))).toBe(false);
});
it('exporta datos y procedencia de la instantánea; test no contiene un candidato optimizado', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('Blob', NativeBlob);
  const blobs: Blob[] = [];
  vi.stubGlobal('URL', {
    createObjectURL: (b: Blob) => {
      blobs.push(b);
      return 'blob:report';
    },
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const w = mount(ProbabilityEvaluation, { props: props() });
  await w.get('textarea').setValue('Los falsos negativos pesan más.');
  const exportButton = w.findAll('button').find((b) => b.text().startsWith('Exportar'))!;
  await exportButton.trigger('click');
  const read = (blob: Blob) => blob.text();
  let report = JSON.parse(await read(blobs[0]!));
  expect(report).toMatchObject({
    format: 'neural-atlas.probability-evaluation-report',
    schemaVersion: 1,
    split: 'validation',
    update: 4,
    source: props().source,
    actual: props().actual,
    reflection: 'Los falsos negativos pesan más.',
  });
  expect(report.validationCandidate.threshold).toBe(0.9);
  expect(report.metrics.perClass[0].points[0].threshold).toBe(null);
  await w.setProps({ split: 'test', frozen: true, consulted: true });
  await exportButton.trigger('click');
  report = JSON.parse(await read(blobs[1]!));
  expect(report.validationCandidate).toBe(null);
  expect(report.testPreviouslyConsulted).toBe(true);
  await vi.runOnlyPendingTimersAsync();
  vi.stubGlobal('URL', {
    createObjectURL: () => {
      throw Error('denied');
    },
  });
  await exportButton.trigger('click');
  expect(w.get('[role="alert"]').text()).toContain('No se pudo exportar');
});
