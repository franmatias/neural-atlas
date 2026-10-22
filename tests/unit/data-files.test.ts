import { describe, expect, it } from 'vitest';
import { defaultGenerator, DataError } from '@/domain/data/types';
import { generateDataset } from '@/domain/data/generate';
import { datasetHash } from '@/domain/data/integrity';
import { splitDataset } from '@/domain/data/split';
import {
  exportDatasetJson,
  guardJson,
  importDatasetJson,
  jsonLimit,
} from '@/application/data/json-files';
import {
  csvLimit,
  exportDatasetCsv,
  mapCsv,
  previewCsv,
  type ColumnMapping,
} from '@/application/data/csv-files';
import { executeDataJob, handleDataJob, type DataJob } from '@/application/data/jobs';
const mapping: ColumnMapping[] = [
  { name: 'valor', role: 'numeric' },
  { name: 'zona', role: 'categorical' },
  { name: 'clase', role: 'target' },
];
const getData = () =>
  generateDataset({
    ...defaultGenerator,
    count: 30,
    recipe: 'flowers',
    missing: 0.2,
    duplicates: 0.2,
    labelNoise: 0.2,
  });
describe('JSON columnar validado e íntegro', () => {
  it('preserva valores, orden de clases, receta, IDs, anotaciones y split', () => {
    const data = getData();
    const split = splitDataset(data, {
      seed: 42,
      strategy: 'stratified-grouped',
      ratios: [0.7, 0.15, 0.15],
    });
    const text = exportDatasetJson(data, split);
    const loaded = importDatasetJson(text);
    expect(loaded).toEqual({ dataset: data, split });
    expect(datasetHash(loaded.dataset)).toBe(datasetHash(data));
    const raw = JSON.parse(text);
    expect(raw.dataset.columns.x1).toHaveLength(30);
    expect(raw.dataset.rows).toBeUndefined();
    expect(raw.provenance.recipeExact).toBe(true);
  });
  it('conserva timestamps, ceros, null y regresión sin clases', () => {
    const data = generateDataset({ ...defaultGenerator, recipe: 'energy', noise: 0, count: 20 });
    data.rows[0]!.target = 0;
    data.rows[1]!.target = null;
    data.rows[0]!.timestamp = '2026-01-01T00:00:00Z';
    expect(importDatasetJson(exportDatasetJson(data)).dataset).toEqual(data);
    data.revision = 2;
    expect(JSON.parse(exportDatasetJson(data)).provenance.recipeExact).toBe(false);
  });
  it('rechaza JSON no nativo, datos corruptos y hashes inconsistentes', () => {
    expect(() => importDatasetJson('{')).toThrow(DataError);
    for (const mutate of [
      (r: Record<string, unknown>) => (r.format = 'model'),
      (r: Record<string, unknown>) => (r.schemaVersion = 99),
      (r: Record<string, unknown>) => (r.dataHash = '0'.repeat(64)),
    ]) {
      const raw = JSON.parse(exportDatasetJson(getData()));
      mutate(raw);
      expect(() => importDatasetJson(JSON.stringify(raw))).toThrow(DataError);
    }
    const raw = JSON.parse(exportDatasetJson(getData()));
    raw.dataset.columns.x1.pop();
    expect(() => importDatasetJson(JSON.stringify(raw))).toThrow(DataError);
    raw.dataset.columns.x1.push(null);
    delete raw.dataset.columns.x2;
    expect(() => importDatasetJson(JSON.stringify(raw))).toThrow(DataError);
  });
  it('bloquea claves peligrosas, profundidad y bytes antes de sustituir nada', () => {
    expect(() => importDatasetJson('{"__proto__":{}}')).toThrow(DataError);
    expect(() => guardJson({ a: 'x'.repeat(4097) })).toThrow(DataError);
    let deep: unknown = null;
    for (let i = 0; i < 22; i++) deep = { a: deep };
    expect(() => guardJson(deep)).toThrow(DataError);
    expect(() => importDatasetJson(' '.repeat(jsonLimit + 1))).toThrow(DataError);
    const raw = JSON.parse(exportDatasetJson(getData()));
    raw.dataset.recipe.seed = 43;
    expect(() => importDatasetJson(JSON.stringify(raw))).toThrow(DataError);
  });
  it('valida el split nativo sin confiar en sus IDs ni sus soportes', () => {
    const data = getData();
    const split = splitDataset(data, { seed: 42, strategy: 'grouped', ratios: [0.7, 0.15, 0.15] });
    const raw = JSON.parse(exportDatasetJson(data, split));
    raw.split.train[0] = raw.split.test[0];
    expect(() => importDatasetJson(JSON.stringify(raw))).toThrow(DataError);
    expect(() => exportDatasetJson(data, { ...split, dataHash: 'bad' })).toThrow(DataError);
  });
});
describe('CSV: dialecto explícito, informe de errores y protección de fórmulas', () => {
  it('preserva comillas, celdas multilínea y cero sin tipado automático', () => {
    const preview = previewCsv(
      '\uFEFFvalor;zona;clase\r\n0;"a; b";0\r\n1;"dijo ""sí""\notra línea";1',
      ';',
    );
    expect(preview.rows[0]).toEqual(['0', 'a; b', '0']);
    expect(preview.rows[1]![1]).toBe('dijo "sí"\notra línea');
    const result = mapCsv(preview, mapping, 'binary', '.', false);
    expect(result.issues).toEqual([]);
    expect(result.dataset!.rows[0]!.features['f-1']).toBe(0);
    expect(result.dataset!.rows[0]!.target).toBe('0');
  });
  it('requiere decimal coherente y no descarta filas sin permiso', () => {
    const preview = previewCsv('a;b;c\n0,8;rojo;0\nerror;azul;1\n1,2;azul;1\n;rojo;0', ';');
    const result = mapCsv(preview, mapping, 'binary', ',', false);
    expect(result.dataset).toBeUndefined();
    expect(result.issues).toEqual([{ row: 3, column: 'valor', code: 'numeric' }]);
    const accepted = mapCsv(preview, mapping, 'binary', ',', true);
    expect(accepted.excluded).toBe(1);
    expect(accepted.dataset!.rows[0]!.features['f-1']).toBe(0.8);
    expect(accepted.dataset!.rows[2]!.features['f-1']).toBeNull();
    expect(mapCsv(preview, mapping, 'binary', '.', false).issues.length).toBeGreaterThan(1);
  });
  it('localiza columnas ausentes, IDs, grupos y fechas inválidos', () => {
    const m: ColumnMapping[] = [
      { name: 'id', role: 'id' },
      { name: 'grupo', role: 'group' },
      { name: 'fecha', role: 'timestamp' },
      { name: 'x', role: 'numeric' },
      { name: 'clase', role: 'target' },
    ];
    const preview = previewCsv(
      'id,g,t,x,y\na,g1,2026-01-01T00:00:00Z,0,0\na,bad!,bad,1,1\nb,g2,,2,1\nc,,',
      ',',
    );
    const result = mapCsv(preview, m, 'binary', '.', false);
    expect(result.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['id', 'timestamp', 'columns']),
    );
    const accepted = mapCsv(preview, m, 'binary', '.', true).dataset!;
    expect(accepted.rows).toHaveLength(2);
    expect(accepted.rows[0]!.groupId).toBe('g1');
    expect(accepted.rows[0]!.timestamp).toBe('2026-01-01T00:00:00Z');
  });
  it('requiere renombrar cabeceras ambiguas, target único y al menos una feature', () => {
    const p = previewCsv('a,a,y\n1,2,0\n2,3,1', ',');
    const bad = [
      { name: 'a', role: 'numeric' as const },
      { name: 'a', role: 'numeric' as const },
      { name: 'y', role: 'target' as const },
    ];
    expect(() => mapCsv(p, bad, 'binary', '.', true)).toThrow(DataError);
    for (const m of [
      [],
      mapping.map((m) => ({ ...m, role: 'ignore' as const })),
      mapping.map((m) => ({ ...m, name: '' })),
      mapping.map((m) => ({ ...m, role: 'target' as const })),
    ])
      expect(() => mapCsv(p, m, 'binary', '.', false)).toThrow(DataError);
  });
  it('regresión admite cero y target nulo; categorías nunca se coercionan', () => {
    const result = mapCsv(
      previewCsv('x,z,y\n0,01,0\n1,02,\n2,03,1.5', ','),
      mapping,
      'regression',
      '.',
      false,
    ).dataset!;
    expect(result.rows[0]!.target).toBe(0);
    expect(result.rows[1]!.target).toBeNull();
    expect(result.rows[0]!.features['f-2']).toBe('01');
    expect(result.classOrder).toBeUndefined();
  });
  it('CSV exportado neutraliza solo cadenas peligrosas, sin alterar JSON ni números negativos', () => {
    const data = getData();
    const strings = ['=1+1', '+SUM(A1)', '-text', '@x', '\tformula', '\rtext', '  =test', 'normal'];
    strings.forEach((s, i) => (data.rows[i]!.features.zone = s));
    data.rows[0]!.features.x1 = -12;
    const exported = exportDatasetCsv(data, ';');
    expect(exported.protectedCount).toBe(7);
    const preview = previewCsv(exported.text, ';');
    expect(preview.rows[0]![3]).toBe('-12');
    expect(preview.rows[0]![5]).toBe("'=1+1");
    expect(data.rows[0]!.features.zone).toBe('=1+1');
    expect(importDatasetJson(exportDatasetJson(data)).dataset.rows[0]!.features.zone).toBe('=1+1');
  });
  it('rechaza delimitadores ambiguos, exceso de filas/columnas/celdas y comillas mal cerradas', () => {
    for (const [text, delimiter] of [
      ['a,b\n1,2', '|'],
      ['"unclosed', ','],
      [Array.from({ length: 65 }, () => 'a').join(','), ','],
      ['a\n' + 'x'.repeat(4097), ','],
      ['x\n' + '1\n'.repeat(10001), ','],
      ['x'.repeat(csvLimit + 1), ','],
    ])
      expect(() => previewCsv(text!, delimiter!)).toThrow(DataError);
    expect(() => exportDatasetCsv(getData(), '|')).toThrow(DataError);
  });
});
describe('despachador ejecutado en el Worker real', () => {
  it('ejecuta generación, split, fit, preview, mapping, import y export', () => {
    const data = executeDataJob({
      kind: 'generate',
      payload: { ...defaultGenerator, count: 20 },
    }) as ReturnType<typeof generateDataset>;
    const split = splitDataset(data, { seed: 42, strategy: 'random', ratios: [0.7, 0.15, 0.15] });
    expect(
      executeDataJob({
        kind: 'split',
        payload: {
          dataset: data,
          options: { seed: 42, strategy: 'random', ratios: [0.7, 0.15, 0.15] },
        },
      }),
    ).toEqual(split);
    const result = executeDataJob({
      kind: 'fit',
      payload: {
        dataset: data,
        split,
        options: {
          featureIds: ['x1'],
          imputation: 'mean',
          scaling: 'none',
          missingIndicators: false,
        },
      },
    }) as { matrix: number[][] };
    expect(result.matrix).toHaveLength(20);
    const preview = previewCsv('x,z,y\n0,a,0\n1,b,1', ',');
    expect(
      executeDataJob({
        kind: 'previewCsv',
        payload: { text: 'x,z,y\n0,a,0\n1,b,1', delimiter: ',' },
      }),
    ).toEqual(preview);
    expect(
      executeDataJob({
        kind: 'mapCsv',
        payload: { preview, mapping, task: 'binary', decimal: '.', excludeInvalid: false },
      }),
    ).toHaveProperty('dataset');
    for (const format of ['csv', 'json'] as const)
      expect(
        executeDataJob({ kind: 'export', payload: { dataset: data, format, delimiter: ',' } }),
      ).toHaveProperty('text');
    expect(
      executeDataJob({ kind: 'importJson', payload: { text: exportDatasetJson(data) } }),
    ).toEqual({ dataset: data });
  });
  it('devuelve errores tipados sin stacks ni mensajes arbitrarios', () => {
    expect(
      handleDataJob(1, { kind: 'generate', payload: { ...defaultGenerator, seed: -1 } }),
    ).toMatchObject({ id: 1, ok: false, code: 'SEED' });
    expect(handleDataJob(2, {} as DataJob)).toMatchObject({ ok: false, code: 'OPTIONS' });
    expect(
      handleDataJob(3, { kind: 'generate', payload: null } as unknown as DataJob),
    ).toMatchObject({ ok: false, code: 'INTERNAL', detail: '' });
    expect(
      handleDataJob(4, { kind: 'generate', payload: { ...defaultGenerator, count: 20 } }),
    ).toMatchObject({ id: 4, ok: true });
  });
});
