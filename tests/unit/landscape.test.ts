import { describe, it, expect } from 'vitest';
import {
  illustrativeSurface,
  frozenSurface,
  sampleSurface,
  traceSurface,
  parameterEntries,
  type Pair,
} from '@/domain/training/landscape';
import { createNetwork, defaultSpec, cloneNetwork } from '@/domain/network/model';
import {
  defaultLandscapeOptions,
  studyLandscape,
  exportLandscape,
  type FrozenCut,
} from '@/application/training/landscape';
const bounds: [number, number, number, number] = [-2, 2, -2, 2];
function fixture(): FrozenCut {
  return {
    model: createNetwork({ ...defaultSpec, inputs: 1, hidden: [], task: 'regression' }, 42, 'zero'),
    samples: { ids: ['a', 'b', 'c'], x: [[-1], [0], [1]], y: [-1, 1, 3] },
    loss: 'mse',
    source: 'fixture train only',
    update: 0,
  };
}
describe('Paisajes y comparación de optimizadores', () => {
  it('valores y gradientes analíticos con diferencias centradas independientes', () => {
    for (const kind of ['bowl', 'saddle', 'wells', 'rosenbrock'] as const) {
      const s = illustrativeSurface(kind),
        x = 0.3,
        y = -0.7,
        h = 1e-5;
      expect(s.gradient(x, y)[0]).toBeCloseTo((s.value(x + h, y) - s.value(x - h, y)) / (2 * h), 5);
      expect(s.gradient(x, y)[1]).toBeCloseTo((s.value(x, y + h) - s.value(x, y - h)) / (2 * h), 5);
    }
    expect(illustrativeSurface('bowl').value(1, 2)).toBe(13);
    expect(illustrativeSurface('saddle').value(0, 1)).toBe(-1);
    expect(illustrativeSurface('wells').value(-1, 0)).toBe(0);
    expect(illustrativeSurface('rosenbrock').value(1, 1)).toBe(0);
    expect(() => illustrativeSurface('bad' as never)).toThrow();
  });
  it('primer paso comparte fórmulas del motor, mismos puntos y momentos cero', () => {
    const s = illustrativeSurface('bowl'),
      start: Pair = [1, 1],
      rate = 0.01;
    for (const kind of ['sgd', 'momentum', 'rmsprop', 'adam'] as const) {
      const p = traceSurface(s, bounds, start, kind, rate, 1, 0);
      expect(p.status).toBe('budget');
      expect(p.points).toHaveLength(2);
      const expected =
        kind === 'sgd' || kind === 'momentum'
          ? [0.98, 0.94]
          : kind === 'rmsprop'
            ? [
                1 - (rate * 2) / (Math.sqrt(0.1 * 4) + 1e-8),
                1 - (rate * 6) / (Math.sqrt(0.1 * 36) + 1e-8),
              ]
            : [1 - (rate * 2) / (2 + 1e-8), 1 - (rate * 6) / (6 + 1e-8)];
      expect(p.points[1]!.x).toBeCloseTo(expected[0]!, 12);
      expect(p.points[1]!.y).toBeCloseTo(expected[1]!, 12);
    }
    const clipped = traceSurface(s, bounds, start, 'sgd', 0.1, 2, 1);
    expect(Math.hypot(...clipped.points[0]!.applied)).toBeCloseTo(1, 12);
    expect(clipped.points[0]!.gradient).toEqual([2, 6]);
    expect(clipped.points[0]!.norm).toBeCloseTo(Math.sqrt(40));
    const m = traceSurface(s, bounds, start, 'momentum', 0.01, 2, 0);
    expect(m.points[2]!.x).toBeCloseTo(0.98 - 0.01 * (0.9 * 2 + 1.96), 12);
  });
  it('estacionariedad no prueba mínimo; salidas y cálculos no finitos se detienen', () => {
    expect(
      traceSurface(illustrativeSurface('saddle'), bounds, [0, 0], 'adam', 0.1, 5, 0).status,
    ).toBe('stationary');
    const p = traceSurface(illustrativeSurface('rosenbrock'), bounds, [-1.2, 1], 'sgd', 1, 5, 0);
    expect(p.status).toBe('outside');
    expect(p.points).toHaveLength(1);
    expect(p.rejected![0]).toBeGreaterThan(2);
    expect(
      traceSurface({ value: () => NaN, gradient: () => [0, 0] }, bounds, [0, 0], 'sgd', 0.1, 2, 0)
        .status,
    ).toBe('nonfinite');
    expect(
      traceSurface(
        {
          value: () => {
            throw Error();
          },
          gradient: () => [0, 0],
        },
        bounds,
        [0, 0],
        'sgd',
        0.1,
        2,
        0,
      ).points,
    ).toHaveLength(0);
    expect(
      traceSurface(
        { value: () => 0, gradient: () => [1e308, 1e308] },
        [-1e308, 1e308, -1e308, 1e308],
        [1e308, 0],
        'momentum',
        1,
        5,
        0,
      ).status,
    ).toBe('nonfinite');
    for (const patch of [
      { start: [3, 0] },
      { kind: 'bad' },
      { rate: 0 },
      { steps: 0 },
      { steps: 301 },
      { clip: -1 },
      { clip: NaN },
    ]) {
      const c = { start: [0, 0], kind: 'sgd', rate: 0.1, steps: 5, clip: 0, ...patch };
      expect(() =>
        traceSurface(
          illustrativeSurface('bowl'),
          bounds,
          c.start as Pair,
          c.kind as never,
          c.rate,
          c.steps,
          c.clip,
        ),
      ).toThrow();
    }
  });
  it('cuadrícula incluye bordes y valida dominios', () => {
    const g = sampleSurface(illustrativeSurface('bowl'), bounds, 25);
    expect(g.values).toHaveLength(625);
    expect(g.values[0]).toBe(16);
    expect(g.values[312]).toBe(0);
    expect(g.min).toBe(0);
    expect(g.max).toBe(16);
    expect(() => sampleSurface(illustrativeSurface('bowl'), bounds, 9)).toThrow();
    expect(() => sampleSurface(illustrativeSurface('bowl'), [1, 1, 0, 2], 25)).toThrow();
    expect(() =>
      sampleSurface({ value: () => Infinity, gradient: () => [0, 0] }, bounds, 25),
    ).toThrow();
  });
  it('corte real reproduce MSE directa, deriva solo dos parámetros y no muta origen', () => {
    const f = fixture(),
      before = cloneNetwork(f.model),
      s = frozenSurface(f.model, f.samples, [0, 1], 'mse');
    expect(parameterEntries(f.model).map((e) => e.label)).toEqual(['C1 · w[1,1]', 'C1 · b[1]']);
    expect(s.value(0, 0)).toBeCloseTo(11 / 3);
    expect(s.value(2, 1)).toBe(0);
    expect(s.gradient(0, 0)[0]).toBeCloseTo(-8 / 3, 6);
    expect(s.gradient(0, 0)[1]).toBeCloseTo(-2, 6);
    expect(f.model).toEqual(before);
    const r = studyLandscape({
      options: { ...defaultLandscapeOptions, mode: 'frozen', start: [0, 0] },
      frozen: f,
    });
    expect(r.grid.bounds).toEqual(bounds);
    expect(r.sourceHash).toHaveLength(64);
    expect(r.provenance!.samples.ids).toEqual(f.samples.ids);
    expect(f.model).toEqual(before);
    const report = JSON.parse(exportLandscape(r));
    expect(report.format).toBe('neural-atlas.landscape-report');
    expect(report.gradientMethod).toContain('h=1e-4');
    expect(report.provenance.model.layers[0].weights).toEqual([0]);
    const normal = createNetwork({ ...defaultSpec, hidden: [2], batchNormalization: true }, 42);
    const nr = studyLandscape({
      options: {
        ...defaultLandscapeOptions,
        mode: 'frozen',
        axes: [0, 1],
        start: [normal.layers[0]!.weights[0]!, normal.layers[0]!.weights[1]!],
        resolution: 10,
        steps: 1,
      },
      frozen: { ...f, model: normal, samples: { ids: ['a'], x: [[0, 0]], y: [0] } },
    });
    expect(JSON.parse(exportLandscape(nr)).provenance.model.layers[0].normalization.gamma).toEqual([
      1, 1,
    ]);
  });
  it('presupuestos, ejes, muestras y configuración inválidos son explícitos', () => {
    const f = fixture();
    for (const axes of [
      [0, 0],
      [0, 99],
      [-1, 0],
    ])
      expect(() => frozenSurface(f.model, f.samples, axes as Pair, 'mse')).toThrow();
    for (const samples of [
      { ...f.samples, x: [] },
      { ...f.samples, y: [] },
      { ...f.samples, ids: [] },
      { ...f.samples, x: [[NaN]] },
      { ids: Array(65).fill('a'), x: Array(65).fill([1]), y: Array(65).fill(1) },
    ])
      expect(() => frozenSurface(f.model, samples, [0, 1], 'mse')).toThrow();
    const large = createNetwork({ ...defaultSpec, hidden: [32, 32] }, 42);
    expect(() => frozenSurface(large, f.samples, [0, 1], 'mse')).toThrow();
    expect(() =>
      studyLandscape({ options: { ...defaultLandscapeOptions, mode: 'frozen' } }),
    ).toThrow();
    expect(() =>
      studyLandscape({ options: { ...defaultLandscapeOptions, resolution: 61 } }),
    ).toThrow();
    const medium = createNetwork(
      { ...defaultSpec, inputs: 1, hidden: [32, 8], task: 'regression' },
      42,
    );
    expect(() =>
      studyLandscape({
        options: {
          ...defaultLandscapeOptions,
          mode: 'frozen',
          start: [medium.layers[0]!.weights[0]!, medium.layers[0]!.weights[1]!],
          resolution: 60,
          steps: 300,
        },
        frozen: {
          ...f,
          model: medium,
          samples: {
            ids: Array.from({ length: 64 }, (_, i) => String(i)),
            x: Array(64).fill([1]),
            y: Array(64).fill(1),
          },
        },
      }),
    ).toThrow('LANDSCAPE_BUDGET');
    const illustrative = studyLandscape({ options: defaultLandscapeOptions });
    expect(illustrative.provenance).toBeUndefined();
    expect(illustrative.paths).toHaveLength(4);
    expect(JSON.parse(exportLandscape(illustrative)).gradientMethod).toBe('analytic');
  });
});
