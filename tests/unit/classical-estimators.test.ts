import { it, expect } from 'vitest';
import {
  fitKnn,
  fitCart,
  predictClassical,
  type ClassicalData,
  type TreeNode,
} from '@/domain/classical/estimators';
const data = (reg = false): ClassicalData => ({
  ids: Array.from({ length: 20 }, (_, i) => 'row-' + i),
  x: Array.from({ length: 20 }, (_, i) => [i, i]),
  y: Array.from({ length: 20 }, (_, i) => (i < 10 ? 0 : reg ? 10 : 1)),
  featureIds: ['z', 'a'],
  task: reg ? 'regression' : 'binary',
  classes: 2,
});
it('vecinos, distancias, voto y empates por ID y clase son exactos; media en regresión', () => {
  const d: ClassicalData = {
    ids: ['b', 'a'],
    x: [[-1], [1]],
    y: [0, 1],
    featureIds: ['x'],
    task: 'binary',
    classes: 2,
  };
  const one = fitKnn(d, 1);
  expect(predictClassical(one, [0]).predicted).toBe(1);
  expect(predictClassical(one, [0]).neighbors[0]!.id).toBe('a');
  const two = predictClassical(fitKnn(d, 2), [0]);
  expect(two.values).toEqual([0.5, 0.5]);
  expect(two.predicted).toBe(0);
  expect(two.distanceCount).toBe(2);
  d.y = [-10, 20];
  d.task = 'regression';
  expect(predictClassical(fitKnn(d, 2), [0]).values).toEqual([5]);
  expect(predictClassical(one, [0]).values).toEqual([0, 1]);
});
it('CART separa con Gini y MSE conocidos y desempata por ID de feature', () => {
  const d = data(),
    tree = fitCart(d, 3);
  expect(tree.root.feature).toBe(1);
  expect(tree.root.threshold).toBe(9.5);
  expect(tree.root.impurity).toBe(0.5);
  expect(tree.root.gain).toBe(0.5);
  expect(tree.root.left!.count).toBe(10);
  expect(tree.root.right!.count).toBe(10);
  expect(predictClassical(tree, [15, 15]).path.map((n) => n.id)).toEqual([0, 2]);
  const reg = fitCart(data(true), 4);
  expect(reg.root.gain).toBeCloseTo(25, 12);
  expect(predictClassical(reg, [15, 15]).values[0]).toBeCloseTo(10, 12);
  expect(fitCart({ ...d, x: d.x.map(() => [1, 1]) }, 4).root.feature).toBeUndefined();
  expect(fitCart({ ...d, y: d.y.map(() => 1) }, 4).root.impurity).toBe(0);
});
it('multiclase, límites de profundidad/hoja y 32 candidatos aproximados', () => {
  const d: ClassicalData = {
    ...data(),
    task: 'multiclass',
    classes: 3,
    ids: Array.from({ length: 120 }, (_, i) => 'r' + i),
    x: Array.from({ length: 120 }, (_, i) => [i % 61, i]),
    y: Array.from({ length: 120 }, (_, i) => i % 3),
  };
  const tree = fitCart(d, 4),
    nodes: TreeNode[] = [];
  function walk(n: TreeNode) {
    nodes.push(n);
    if (n.left) {
      walk(n.left);
      walk(n.right!);
    }
  }
  walk(tree.root);
  expect(nodes.length).toBeLessThanOrEqual(31);
  expect(nodes.every((n) => n.depth <= 4 && n.count >= 5)).toBe(true);
  expect(tree.candidates).toBeLessThanOrEqual(15 * 2 * 32);
  expect(predictClassical(tree, [4, 4]).values.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 12);
  expect(fitCart({ ...data(), ids: ['x'], x: [[0, 0]], y: [1] }, 2).root.count).toBe(1);
});
it('rechaza datos, parámetros y consultas fuera de contrato antes de calcular', () => {
  const d = data();
  for (const k of [0, 1.1, 16, NaN]) expect(() => fitKnn(d, k)).toThrow();
  for (const depth of [0, 5, 1.5]) expect(() => fitCart(d, depth)).toThrow();
  for (const patch of [
    { ids: [] },
    { ids: d.ids.map(() => 'same') },
    { x: [[NaN]] },
    { y: [Infinity] },
    { featureIds: [] },
    { classes: 1 },
    { classes: 3 },
    { y: d.y.map(() => 0.5) },
    { x: d.x.map(() => [1e7, 0]) },
  ])
    expect(() => fitKnn({ ...d, ...patch }, 1)).toThrow();
  for (const x of [[], [Infinity, 1], [1e7, 2]])
    expect(() => predictClassical(fitKnn(d, 1), x)).toThrow();
});
