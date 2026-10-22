import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import rngVectors from '../../docs/fixtures/rng-v1.json';
import { createRandom, deriveSeed, shuffle } from '@/domain/random/seeded';
import {
  canonicalJson,
  datasetHash,
  hashText,
  hashValue,
  utf8,
  utf8Length,
} from '@/domain/data/integrity';
import {
  DataError,
  defaultGenerator,
  recipeIds,
  type Dataset,
  type GeneratorOptions,
  type Sample,
  type SplitOptions,
} from '@/domain/data/types';
import { generateDataset } from '@/domain/data/generate';
import { validateDataset, validTimestamp } from '@/domain/data/validation';
import { allocate, splitDataset, splitWarnings, validateSplit } from '@/domain/data/split';
import { fitPipeline, transformRow } from '@/domain/data/pipeline';
import { editDataset } from '@/domain/data/edit';
import { profileDataset } from '@/domain/data/profile';
import { mode, numericStatistics, quantile } from '@/domain/data/statistics';
const options: SplitOptions = { strategy: 'stratified', seed: 42, ratios: [0.7, 0.15, 0.15] };
function fixture(): Dataset {
  return {
    id: 'fixture',
    revision: 1,
    task: 'binary',
    classOrder: ['0', '1'],
    targetName: 'clase',
    features: [
      { id: 'value', name: 'Valor', kind: 'numeric' },
      { id: 'color', name: 'Color', kind: 'categorical' },
    ],
    rows: Array.from({ length: 20 }, (_, i) => ({
      id: `r${i}`,
      features: { value: i, color: i % 2 ? 'rojo' : 'azul' },
      target: String(i % 2),
      origin: 'imported',
    })),
  };
}
function errorCode(action: () => unknown, code: string) {
  expect(action).toThrowError(expect.objectContaining({ code }));
}
describe('RNG del motor, vectores independientes del diseño', () => {
  it.each(rngVectors.vectors)('reproduce $purpose', (vector) => {
    expect(deriveSeed(vector.seed, vector.purpose)).toBe(vector.derivedState);
    const rng = createRandom(vector.seed, vector.purpose);
    expect(Array.from({ length: 5 }, () => rng.nextUint32())).toEqual(vector.firstUint32);
  });
  it('usa caché Box–Muller y permutaciones que no mutan el original', () => {
    const a = createRandom(42, 'generation');
    const b = createRandom(42, 'generation');
    const u1 = 1 - b.uniform();
    const u2 = b.uniform();
    expect(a.normal()).toBeCloseTo(Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2), 14);
    expect(a.snapshot().spare).not.toBeNull();
    expect(a.normal()).toBeCloseTo(Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2), 14);
    expect(a.snapshot().spare).toBeNull();
    const input = [1, 2, 3, 4, 5];
    expect(shuffle(input, 42, 'split')).toEqual(shuffle(input, 42, 'split'));
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(shuffle(input, 0, 'split')).size).toBe(5);
  });
  it.each([-1, 0.5, Infinity, 4294967296])('rechaza semilla %s', (seed) =>
    errorCode(() => createRandom(seed, 'generation'), 'SEED'),
  );
  it('rechaza propósito no ASCII y acepta extremos uint32', () => {
    errorCode(() => deriveSeed(1, 'Generación'), 'SEED');
    expect(createRandom(0xffffffff, 'generation').uniform()).toBeLessThan(1);
  });
});
describe('hash canónico portable', () => {
  it.each(['', 'abc', 'café🙂', '\uD800', '€\t\n'])(
    'coincide con SHA-256 nativo y UTF8: %j',
    (text) => {
      expect(hashText(text)).toBe(createHash('sha256').update(text).digest('hex'));
      expect(utf8(text)).toEqual(new Uint8Array(Buffer.from(text)));
      expect(utf8Length(text)).toBe(Buffer.byteLength(text));
    },
  );
  it('ordena claves, normaliza -0 y rechaza valores no JSON', () => {
    expect(canonicalJson({ z: [-0, true, null], a: 'a' })).toBe('{"a":"a","z":[0,true,null]}');
    expect(hashValue({ a: 1, b: 2 })).toBe(hashValue({ b: 2, a: 1 }));
    for (const value of [undefined, NaN, Infinity, () => {}, new Map()])
      errorCode(() => canonicalJson(value), 'SCHEMA');
  });
});
describe('recetas sintéticas con procedencia y fallos', () => {
  it.each(recipeIds)('%s es reproducible, finita y con IDs únicos', (recipe) => {
    const data = generateDataset({
      ...defaultGenerator,
      recipe,
      count: 40,
      outliers: 0.2,
      labelNoise: 0.3,
      missing: 0.3,
      duplicates: 0.2,
    });
    expect(data).toEqual(
      generateDataset({
        ...defaultGenerator,
        recipe,
        count: 40,
        outliers: 0.2,
        labelNoise: 0.3,
        missing: 0.3,
        duplicates: 0.2,
      }),
    );
    expect(data.rows).toHaveLength(40);
    expect(new Set(data.rows.map((r) => r.id)).size).toBe(40);
    expect(() => validateDataset(data)).not.toThrow();
    for (const row of data.rows.filter((r) => r.annotation?.sourceId))
      expect(row.groupId).toBe(data.rows.find((r) => r.id === row.annotation!.sourceId)!.groupId);
  });
  it('una corrupción de etiquetas no cambia las features ni renombra toda la clase', () => {
    const clean = generateDataset({ ...defaultGenerator, count: 1000, noise: 0 });
    const dirty = generateDataset({ ...defaultGenerator, count: 1000, noise: 0, labelNoise: 0.3 });
    expect(dirty.rows.map((r) => r.features)).toEqual(clean.rows.map((r) => r.features));
    const changed = dirty.rows.filter((r, i) => r.target !== clean.rows[i]!.target);
    expect(changed.length).toBeGreaterThan(200);
    expect(changed.length).toBeLessThan(400);
    expect(changed.every((r) => r.target !== r.annotation!.cleanTarget)).toBe(true);
  });
  it('reporta defectos y mantiene el techo de 10000 filas con duplicados', () => {
    const data = generateDataset({
      ...defaultGenerator,
      count: 10000,
      noise: 1,
      duplicates: 0.2,
      minority: 0.05,
    });
    const p = profileDataset(data);
    expect(p.count).toBe(10000);
    expect(p.defects.duplicate).toBe(2000);
    expect(p.duplicateGroups).toBeGreaterThan(0);
    expect(p.support['1']).toBeGreaterThan(300);
    expect(p.unlabelled).toBe(0);
  });
  it('rechaza controles fuera de límites antes de reservar datos', () => {
    const changes: Partial<GeneratorOptions>[] = [
      { count: 19 },
      { count: 10001 },
      { count: 2.5 },
      { recipe: 'other' as GeneratorOptions['recipe'] },
      { noise: -1 },
      { noise: NaN },
      { outliers: 0.21 },
      { labelNoise: 0.31 },
      { missing: 0.31 },
      { duplicates: 0.21 },
      { minority: 0 },
      { minority: Infinity },
    ];
    for (const change of changes)
      errorCode(() => generateDataset({ ...defaultGenerator, ...change }), 'OPTIONS');
  });
});
describe('split: IDs, grupos, soporte y orden temporal', () => {
  it('20 IDs se reparten 14/3/3 y el mayor resto no pierde filas', () => {
    expect(allocate(20, options.ratios)).toEqual([14, 3, 3]);
    expect(allocate(4, options.ratios)).toEqual([3, 1, 0]);
    for (let n = 0; n < 100; n++)
      expect(allocate(n, options.ratios).reduce((a, b) => a + b, 0)).toBe(n);
    const split = splitDataset(fixture(), { ...options, strategy: 'random' });
    expect([split.train.length, split.validation.length, split.test.length]).toEqual([14, 3, 3]);
    validateSplit(fixture(), split);
  });
  it('nunca mezcla IDs ni copias del mismo grupo, aun cambiando ratios/semilla', () => {
    for (let seed = 0; seed < 15; seed++) {
      const data = generateDataset({
        ...defaultGenerator,
        seed,
        count: 40 + seed,
        duplicates: 0.2,
      });
      const split = splitDataset(data, { ...options, seed });
      expect(split.strategy).toBe('stratified-grouped');
      const partition = new Map([
        ...split.train.map((id) => [id, 'train'] as const),
        ...split.validation.map((id) => [id, 'validation'] as const),
        ...split.test.map((id) => [id, 'test'] as const),
      ]);
      expect(partition.size).toBe(data.rows.length);
      const groupPartition = new Map<string, string>();
      for (const row of data.rows)
        if (row.groupId) {
          const name = partition.get(row.id)!;
          expect(groupPartition.get(row.groupId) ?? name).toBe(name);
          groupPartition.set(row.groupId, name);
        }
    }
  });
  it('la regresión agrupada y grupos indivisibles muestran soporte real', () => {
    const data = generateDataset({
      ...defaultGenerator,
      recipe: 'energy',
      count: 20,
      duplicates: 0.2,
    });
    const split = splitDataset(data, { ...options, strategy: 'random' });
    expect(split.strategy).toBe('grouped');
    expect(split.supportByClass).toEqual({});
    const one = fixture();
    one.rows = one.rows.map((r) => ({ ...r, groupId: 'all' }));
    expect(splitWarnings(splitDataset(one, options)).blocked).toBe(true);
  });
  it('estratifica por clases y excluye objetivos desconocidos', () => {
    const data = fixture();
    data.rows[0]!.target = null;
    const split = splitDataset(data, options);
    expect([...split.train, ...split.validation, ...split.test]).not.toContain('r0');
    expect(splitWarnings(split)).toEqual({ blocked: false, unstable: true });
    const large = splitDataset(generateDataset({ ...defaultGenerator, count: 300 }), options);
    expect(splitWarnings(large)).toEqual({ blocked: false, unstable: false });
    const p = profileDataset(data);
    expect(p.unlabelled).toBe(1);
  });
  it('temporal conserva grupos solapados y no mezcla timestamps iguales', () => {
    const data = fixture();
    data.rows = data.rows.map((r, i) => ({
      ...r,
      timestamp: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
    }));
    data.rows[0]!.groupId = 'g';
    data.rows[5]!.groupId = 'g';
    const split = splitDataset(data, { ...options, strategy: 'temporal' });
    const byId = new Map(data.rows.map((r) => [r.id, r.timestamp!]));
    expect(Math.max(...split.train.map((id) => Number(byId.get(id)!.slice(8, 10))))).toBeLessThan(
      Math.min(...split.validation.map((id) => Number(byId.get(id)!.slice(8, 10)))),
    );
    const index = [split.train, split.validation, split.test].findIndex((ids) =>
      ids.includes('r0'),
    );
    expect([split.train, split.validation, split.test][index]).toContain('r5');
    const same = fixture();
    same.rows = same.rows.map((r) => ({ ...r, timestamp: '2026-01-01T00:00:00Z' }));
    const atomic = splitDataset(same, { ...options, strategy: 'temporal' });
    expect(atomic.train).toHaveLength(20);
    expect(splitWarnings(atomic).blocked).toBe(true);
  });
  it('bloquea ratios, timestamp, revisión y hash incoherentes', () => {
    for (const ratios of [
      [0.8, 0.15, 0.15],
      [0.9, 0.05, 0.05],
      [NaN, 0.5, 0.5],
      [0.5, 0.5],
    ] as unknown as SplitOptions['ratios'][])
      errorCode(() => splitDataset(fixture(), { ...options, ratios }), 'RATIO');
    errorCode(
      () => splitDataset(fixture(), { ...options, strategy: 'other' as SplitOptions['strategy'] }),
      'OPTIONS',
    );
    errorCode(() => splitDataset(fixture(), { ...options, strategy: 'temporal' }), 'TIMESTAMP');
    const data = fixture();
    const split = splitDataset(data, options);
    errorCode(() => validateSplit(data, { ...split, splitHash: 'x' }), 'INTEGRITY');
    data.rows[0]!.features.value = 1000;
    errorCode(() => validateSplit(data, split), 'INTEGRITY');
  });
});
describe('fit solo train: imputación, vocabulario fijo y escalado', () => {
  it('no usa validation/test y conserva valores min-max fuera de [0,1]', () => {
    const data = fixture();
    const preliminary = splitDataset(data, options);
    const train = new Set(preliminary.train);
    data.rows.forEach((r) => {
      r.features.value = train.has(r.id) ? (Number(r.id.slice(1)) % 2) * 10 : 100;
      r.features.color = train.has(r.id) ? 'rojo' : 'verde';
    });
    const split = splitDataset(data, options);
    const pipeline = fitPipeline(data, split, {
      featureIds: ['value', 'color'],
      imputation: 'mean',
      scaling: 'minmax',
      missingIndicators: true,
    });
    const val = data.rows.find((r) => r.id === split.validation[0])!;
    expect(transformRow(val, pipeline)).toEqual([10, 0, 0, 1, 0]);
    expect(pipeline.columns[1]).toEqual({
      kind: 'categorical',
      id: 'color',
      fill: 'rojo',
      vocabulary: ['rojo'],
    });
    expect(pipeline.fittedOn.idsHash).toBe(hashValue(split.train));
  });
  it.each(['mean', 'median', 'mode'] as const)(
    'imputa con %s, sin usar los faltantes como ceros',
    (imputation) => {
      const data = fixture();
      data.rows[0]!.features.value = null;
      data.rows[1]!.features.color = null;
      const split = splitDataset(data, options);
      const state = fitPipeline(data, split, {
        featureIds: ['value', 'color'],
        imputation,
        scaling: 'standard',
        missingIndicators: true,
      });
      const values = data.rows
        .filter((r) => split.train.includes(r.id) && r.features.value !== null)
        .map((r) => r.features.value as number);
      const numeric = state.columns[0]!;
      expect(numeric.kind).toBe('numeric');
      if (numeric.kind === 'numeric' && imputation === 'mean')
        expect(numeric.fill).toBeCloseTo(values.reduce((a, b) => a + b, 0) / values.length);
      expect(transformRow(data.rows[0]!, state).every(Number.isFinite)).toBe(true);
      expect(transformRow(data.rows[0]!, state)[1]).toBe(1);
    },
  );
  it('constantes producen cero, no divide por cero y escala none conserva unidades', () => {
    const data = fixture();
    data.rows.forEach((r) => (r.features.value = 7));
    const split = splitDataset(data, options);
    for (const scaling of ['minmax', 'standard', 'none'] as const) {
      const state = fitPipeline(data, split, {
        featureIds: ['value'],
        imputation: 'mean',
        scaling,
        missingIndicators: false,
      });
      expect(transformRow(data.rows[0]!, state)).toEqual([scaling === 'none' ? 7 : 0]);
    }
  });
  it('bloquea todas faltantes, opciones inválidas, dimensiones y tipo incoherente', () => {
    const data = fixture();
    const fitOptions = {
      featureIds: ['value'],
      imputation: 'mean' as const,
      scaling: 'minmax' as const,
      missingIndicators: false,
    };
    const split = splitDataset(data, options);
    errorCode(() => fitPipeline(data, split, { ...fitOptions, featureIds: [] }), 'PIPELINE');
    errorCode(
      () => fitPipeline(data, split, { ...fitOptions, featureIds: ['missing'] }),
      'PIPELINE',
    );
    errorCode(
      () => fitPipeline(data, split, { ...fitOptions, featureIds: ['value', 'value'] }),
      'PIPELINE',
    );
    errorCode(
      () => fitPipeline(data, split, { ...fitOptions, imputation: 'other' as 'mean' }),
      'PIPELINE',
    );
    errorCode(
      () => fitPipeline(data, split, { ...fitOptions, scaling: 'other' as 'none' }),
      'PIPELINE',
    );
    const fitted = fitPipeline(data, split, fitOptions);
    errorCode(() => transformRow({ ...data.rows[0]!, features: {} }, fitted), 'PIPELINE');
    errorCode(
      () => transformRow({ ...data.rows[0]!, features: { value: 'bad' } }, fitted),
      'PIPELINE',
    );
    errorCode(
      () => transformRow({ ...data.rows[0]!, features: { value: Infinity } }, fitted),
      'NON_FINITE',
    );
    data.rows.forEach((r) => (r.features.value = null));
    errorCode(() => fitPipeline(data, splitDataset(data, options), fitOptions), 'ALL_MISSING');
    const wide = fixture();
    wide.rows = Array.from({ length: 100 }, (_, i) => ({
      id: `r${i}`,
      features: { value: i, color: `cat${i}` },
      target: String(i % 2),
      origin: 'imported',
    }));
    errorCode(
      () =>
        fitPipeline(wide, splitDataset(wide, options), { ...fitOptions, featureIds: ['color'] }),
      'DIMENSIONS',
    );
  });
});
describe('validación y edición coherentes', () => {
  it('revisa fechas UTC, años bisiestos y fronteras del calendario', () => {
    for (const value of ['2024-02-29T23:59:59Z', '2000-02-29T00:00:00.000Z'])
      expect(validTimestamp(value)).toBe(true);
    for (const value of [
      '1900-02-29T00:00:00Z',
      '2026-02-30T00:00:00Z',
      '2026-00-01T00:00:00Z',
      '2026-13-01T00:00:00Z',
      '2026-01-00T00:00:00Z',
      '2026-01-01T24:00:00Z',
      '2026-01-01',
      '0000-01-01T00:00:00Z',
    ])
      expect(validTimestamp(value)).toBe(false);
  });
  it('edita por ID sin mutación y cambia hash/revisión; null target es inferencia', () => {
    const data = fixture();
    const old = datasetHash(data);
    const row = {
      ...data.rows[0]!,
      features: { value: null, color: 'rojo' },
      target: null,
      origin: 'manual' as const,
    };
    const next = editDataset(data, { type: 'replace', row });
    expect(next.revision).toBe(2);
    expect(datasetHash(next)).not.toBe(old);
    expect(data.rows[0]!.target).toBe('0');
    const added = editDataset(next, { type: 'add', row: { ...row, id: 'new' } });
    expect(added.rows).toHaveLength(21);
    expect(editDataset(added, { type: 'remove', id: 'new' }).rows).toHaveLength(20);
    errorCode(() => editDataset(data, { type: 'remove', id: 'none' }), 'SCHEMA');
    errorCode(() => editDataset(data, { type: 'add', row: data.rows[0]! }), 'SCHEMA');
    errorCode(() => editDataset(data, { type: 'replace', row: { ...row, id: 'none' } }), 'SCHEMA');
  });
  it('rechaza tipos, clases, IDs duplicados y campos peligrosos', () => {
    const changes: ((d: Dataset) => void)[] = [
      (d) => (d.id = '__proto__'),
      (d) => (d.revision = 0),
      (d) => (d.task = 'other' as Dataset['task']),
      (d) => (d.targetName = ''),
      (d) => (d.features = []),
      (d) => d.features.push({ ...d.features[0]! }),
      (d) => (d.features[0]!.name = d.targetName),
      (d) => d.rows.push(d.rows[0]!),
      (d) => (d.rows[0]!.groupId = '__proto__'),
      (d) => (d.rows[0]!.origin = 'bad' as Sample['origin']),
      (d) => (d.rows[0]!.timestamp = 'bad'),
      (d) => (d.rows[0]!.features.value = Infinity),
      (d) => (d.rows[0]!.features.color = 1),
      (d) => (d.rows[0]!.features.other = 3),
      (d) => (d.rows[0]!.target = 'unknown'),
      (d) => (d.classOrder = ['0']),
      (d) => (d.classOrder = ['0', '0']),
      (d) => delete d.classOrder,
    ];
    for (const change of changes) {
      const data = fixture();
      change(data);
      expect(() => validateDataset(data)).toThrow(DataError);
    }
  });
  it('estadísticas tienen oráculos independientes y no admiten overflow', () => {
    expect(numericStatistics([2, 4, 6])).toEqual({
      count: 3,
      mean: 4,
      std: Math.sqrt(8 / 3),
      min: 2,
      max: 6,
      median: 4,
    });
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(mode(['b', 'a', 'a', 'b'])).toBe('b');
    errorCode(() => mode([]), 'ALL_MISSING');
    errorCode(() => quantile([], 0.5), 'ALL_MISSING');
    errorCode(() => numericStatistics([]), 'ALL_MISSING');
    errorCode(() => numericStatistics([1e308, -1e308]), 'NON_FINITE');
  });
});
