import { expect, it } from 'vitest';
import {
  probabilityMetrics,
  rankingMetrics,
  decisionCost,
  bestCostThreshold,
  validateCosts,
} from '@/domain/training/probability-metrics';
import { classificationMetrics } from '@/domain/training/metrics';

it('ROC y AP tienen oráculos distintos y agrupan empates sin depender del orden', () => {
  const r = rankingMetrics([0, 0, 1, 1], [0.1, 0.4, 0.35, 0.8]);
  expect(r.auc).toBe(0.75);
  expect(r.ap).toBeCloseTo(5 / 6, 14);
  expect(r.points.map((p) => p.threshold)).toEqual([null, 0.8, 0.4, 0.35, 0.1]);
  expect(r.points[0]).toMatchObject({ tp: 0, fp: 0, tn: 2, fn: 2, precision: 1, recall: 0 });
  expect(r.points.at(-1)).toMatchObject({ tp: 2, fp: 2, tpr: 1, fpr: 1 });
  const tied = rankingMetrics([1, 0, 0, 1], [0.5, 0.5, 0.5, 0.5]);
  expect(tied.points).toHaveLength(2);
  expect(tied.auc).toBe(0.5);
  expect(tied.ap).toBe(0.5);
  expect(rankingMetrics([0, 1, 1, 0], [0.5, 0.5, 0.5, 0.5])).toEqual(tied);
});
it('ranking perfecto, inverso y clases ausentes conservan extremos e indefinidos', () => {
  expect(rankingMetrics([0, 1], [0, 1])).toMatchObject({ auc: 1, ap: 1 });
  expect(rankingMetrics([0, 1], [1, 0])).toMatchObject({ auc: 0, ap: 0.5 });
  const absent = rankingMetrics([0, 0], [0.2, 0.8]);
  expect(absent).toMatchObject({ auc: null, ap: null, prevalence: 0 });
  expect(absent.points.every((p) => p.recall === null && p.tpr === null)).toBe(true);
  const all = rankingMetrics([1, 1], [0.2, 0.8]);
  expect(all).toMatchObject({ auc: null, ap: 1, prevalence: 1 });
  expect(all.points.every((p) => p.fpr === null)).toBe(true);
});
it('Brier binario escalar, fiabilidad con intervalos vacíos y límite 1 inclusivo', () => {
  const m = probabilityMetrics([0, 1, 1, 0], [[0], [0.2], [1], [0.8]], 2, 5);
  expect(m.brier).toBeCloseTo(0.32, 14);
  expect(m.convention).toBe('binary-scalar');
  expect(m.perClass[1]!.bins.map((b) => b.count)).toEqual([1, 1, 0, 0, 2]);
  expect(m.perClass[1]!.bins[2]).toMatchObject({ count: 0, mean: null, frequency: null });
  expect(m.perClass[1]!.bins[4]).toMatchObject({ mean: 0.9, frequency: 0.5 });
  expect(m.perClass[0]!.brier).toBeCloseTo(m.perClass[1]!.brier, 14);
});
it('Brier multiclase suma por muestra sin dividir entre K; macro excluye clases ausentes', () => {
  const m = probabilityMetrics(
    [0, 1],
    [
      [0.7, 0.2, 0.1],
      [0.1, 0.8, 0.1],
    ],
    3,
  );
  expect(m.brier).toBeCloseTo((0.14 + 0.06) / 2, 14);
  expect(m.convention).toBe('multiclass-sum');
  expect(m.macroAuc).toEqual({ value: 1, defined: 2, excluded: 1 });
  expect(m.macroAp).toEqual({ value: 1, defined: 2, excluded: 1 });
  expect(probabilityMetrics([0], [[1, 0, 0]], 3).macroAuc).toEqual({
    value: null,
    defined: 0,
    excluded: 3,
  });
  expect(probabilityMetrics([0], [[0, 1, 0]], 3).brier).toBe(2);
});
it('costes usan orientación real/predicha y optimizan en el sentido de la clase positiva', () => {
  expect(
    decisionCost(
      [
        [7, 2],
        [3, 8],
      ],
      [
        [0, 2],
        [5, 0],
      ],
    ),
  ).toBe(19 / 20);
  const y = [0, 0, 1, 1],
    p = [[0.1], [0.6], [0.4], [0.9]],
    costs = [
      [0, 1],
      [5, 0],
    ];
  const result = bestCostThreshold(y, p, 1, costs);
  expect(result.threshold).toBe(0.4);
  expect(result.cost).toBe(0.25);
  const flipped = bestCostThreshold(y, p, 0, costs);
  expect(flipped.cost).toBe(0.25);
  for (const positive of [0, 1]) {
    const best = bestCostThreshold(y, p, positive, costs);
    expect(
      decisionCost(classificationMetrics(y, p, 2, best.threshold, positive).matrix, costs),
    ).toBe(best.cost);
  }
  expect(
    bestCostThreshold(
      y,
      p.map((v) => [1 - v[0]!, v[0]!]),
      1,
      costs,
    ),
  ).toEqual(result);
});
it('umbral restringido a [0,1], empates por el mayor y p=1 nunca rechazado con umbral 1', () => {
  expect(
    bestCostThreshold([0, 1], [[0.2], [0.8]], 1, [
      [0, 0],
      [0, 0],
    ]),
  ).toMatchObject({ threshold: 1, cost: 0 });
  expect(
    bestCostThreshold([0], [[1]], 1, [
      [0, 3],
      [1, 0],
    ]),
  ).toMatchObject({ threshold: 1, cost: 3 });
  expect(
    bestCostThreshold([1], [[0]], 1, [
      [0, 1],
      [5, 0],
    ]),
  ).toMatchObject({ threshold: 0, cost: 0 });
});
it('rechaza etiquetas, probabilidades, tamaños, bins y matrices inválidos', () => {
  for (const [y, p] of [
    [[], []],
    [[1], []],
    [[2], [0.5]],
    [[0.5], [0.5]],
    [[0], [NaN]],
    [[0], [-1]],
    [[0], [1.1]],
  ] as [number[], number[]][])
    expect(() => rankingMetrics(y, p)).toThrow('METRICS');
  for (const bins of [0, 4, 21, 5.5, NaN])
    expect(() => probabilityMetrics([0], [[0.2]], 2, bins)).toThrow('METRICS');
  for (const p of [[[NaN]], [[1.1]], [[0.2, 0.3]], [[0.2, 0.3, 0.5]]])
    expect(() => probabilityMetrics([0], p, 2)).toThrow();
  for (const c of [
    [],
    [[1]],
    [
      [0, -1],
      [1, 0],
    ],
    [
      [0, Infinity],
      [1, 0],
    ],
    [
      [0, 1000001],
      [1, 0],
    ],
    [[0, 1], [0]],
  ])
    expect(() => validateCosts(c, 2)).toThrow('COSTS');
  expect(() => validateCosts([[0]], 1)).toThrow('COSTS');
  for (const matrix of [
    [
      [0, 0],
      [0, 0],
    ],
    [[1]],
    [
      [-1, 1],
      [1, 0],
    ],
    [
      [0.5, 1],
      [1, 0],
    ],
    [
      [Number.MAX_SAFE_INTEGER, 1],
      [1, 0],
    ],
  ])
    expect(() =>
      decisionCost(matrix, [
        [0, 1],
        [1, 0],
      ]),
    ).toThrow('COSTS');
  expect(() =>
    bestCostThreshold([0], [[0.5]], 2, [
      [0, 1],
      [1, 0],
    ]),
  ).toThrow('METRICS');
});
