import type { Task } from '@/domain/data/types';
export interface ClassicalData {
  ids: string[];
  x: number[][];
  y: number[];
  featureIds: string[];
  task: Task;
  classes: number;
}
export interface KnnModel {
  family: 'knn';
  data: ClassicalData;
  k: number;
}
export interface TreeNode {
  id: number;
  depth: number;
  count: number;
  impurity: number;
  output: number[];
  feature?: number;
  threshold?: number;
  gain?: number;
  left?: TreeNode;
  right?: TreeNode;
}
export interface CartModel {
  family: 'cart';
  data: ClassicalData;
  maxDepth: number;
  minLeaf: 5;
  root: TreeNode;
  candidates: number;
}
export type ClassicalModel = KnnModel | CartModel;
export function validateClassicalData(d: ClassicalData) {
  if (
    !['binary', 'multiclass', 'regression'].includes(d.task) ||
    !d.ids.length ||
    d.ids.length > 600 ||
    d.ids.length !== d.x.length ||
    d.y.length !== d.ids.length ||
    new Set(d.ids).size !== d.ids.length ||
    d.ids.some((id) => typeof id !== 'string' || !id || id.length > 128) ||
    !d.featureIds.length ||
    d.featureIds.length > 16 ||
    new Set(d.featureIds).size !== d.featureIds.length ||
    d.featureIds.some((id) => typeof id !== 'string' || !id || id.length > 256) ||
    !Number.isInteger(d.classes) ||
    d.classes < 2 ||
    d.classes > 10 ||
    (d.task === 'binary' && d.classes !== 2)
  )
    throw Error('CLASSICAL_DATA');
  if (
    d.x.some(
      (x) =>
        x.length !== d.featureIds.length || x.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e6),
    ) ||
    d.y.some(
      (y) =>
        !Number.isFinite(y) ||
        Math.abs(y) > 1e9 ||
        (d.task !== 'regression' && (!Number.isInteger(y) || y < 0 || y >= d.classes)),
    )
  )
    throw Error('CLASSICAL_VALUES');
}
const ascii = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
function output(d: ClassicalData, indices: number[]) {
  return d.task === 'regression'
    ? [indices.reduce((s, i) => s + d.y[i]! / indices.length, 0)]
    : Array.from(
        { length: d.classes },
        (_, c) => indices.filter((i) => d.y[i] === c).length / indices.length,
      );
}
function impurity(d: ClassicalData, indices: number[], out: number[]) {
  return d.task === 'regression'
    ? indices.reduce((s, i) => s + (d.y[i]! - out[0]!) ** 2 / indices.length, 0)
    : 1 - out.reduce((s, p) => s + p * p, 0);
}
export function fitKnn(data: ClassicalData, k: number): KnnModel {
  validateClassicalData(data);
  if (!Number.isInteger(k) || k < 1 || k > Math.min(15, data.ids.length)) throw Error('K');
  return { family: 'knn', data: structuredClone(data), k };
}
export function fitCart(data: ClassicalData, maxDepth: number): CartModel {
  validateClassicalData(data);
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 4) throw Error('DEPTH');
  const d = structuredClone(data);
  let candidates = 0,
    nextId = 0;
  const features = d.featureIds.map((id, i) => ({ id, i })).sort((a, b) => ascii(a.id, b.id));
  function build(indices: number[], depth: number): TreeNode {
    const out = output(d, indices),
      node: TreeNode = {
        id: nextId++,
        depth,
        count: indices.length,
        output: out,
        impurity: impurity(d, indices, out),
      };
    if (depth === maxDepth || indices.length < 10 || node.impurity <= 1e-12) return node;
    let best:
      | { feature: number; threshold: number; gain: number; left: number[]; right: number[] }
      | undefined;
    for (const { i: feature } of features) {
      const values = [...new Set(indices.map((i) => d.x[i]![feature]!))].sort((a, b) => a - b),
        all = values.slice(0, -1).map((v, i) => v / 2 + values[i + 1]! / 2);
      const thresholds =
        all.length <= 32
          ? all
          : Array.from({ length: 32 }, (_, i) => all[Math.floor((i * (all.length - 1)) / 31)]!);
      for (const threshold of thresholds) {
        candidates++;
        const left = indices.filter((i) => d.x[i]![feature]! <= threshold),
          right = indices.filter((i) => d.x[i]![feature]! > threshold);
        if (left.length < 5 || right.length < 5) continue;
        const gain =
          node.impurity -
          (left.length * impurity(d, left, output(d, left)) +
            right.length * impurity(d, right, output(d, right))) /
            indices.length;
        if (gain > 1e-12 && (!best || gain > best.gain + 1e-12))
          best = { feature, threshold, gain, left, right };
      }
    }
    if (best) {
      node.feature = best.feature;
      node.threshold = best.threshold;
      node.gain = best.gain;
      node.left = build(best.left, depth + 1);
      node.right = build(best.right, depth + 1);
    }
    return node;
  }
  return {
    family: 'cart',
    data: d,
    maxDepth,
    minLeaf: 5,
    root: build(
      d.ids.map((_, i) => i),
      0,
    ),
    candidates,
  };
}
export function predictClassical(model: ClassicalModel, x: number[]) {
  if (
    x.length !== model.data.featureIds.length ||
    x.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e6)
  )
    throw Error('QUERY');
  if (model.family === 'knn') {
    const neighbors = model.data.ids
      .map((id, i) => ({
        id,
        index: i,
        target: model.data.y[i]!,
        distance: Math.hypot(...x.map((v, j) => v - model.data.x[i]![j]!)),
      }))
      .sort((a, b) => a.distance - b.distance || ascii(a.id, b.id))
      .slice(0, model.k);
    const values = output(
      model.data,
      neighbors.map((n) => n.index),
    );
    return {
      values,
      predicted:
        model.data.task === 'regression' ? values[0]! : values.indexOf(Math.max(...values)),
      neighbors,
      path: [] as TreeNode[],
      distanceCount: model.data.ids.length,
    };
  }
  const path: TreeNode[] = [];
  let node = model.root;
  while (true) {
    path.push(node);
    if (node.feature === undefined) break;
    node = x[node.feature]! <= node.threshold! ? node.left! : node.right!;
  }
  return {
    values: [...node.output],
    predicted:
      model.data.task === 'regression'
        ? node.output[0]!
        : node.output.indexOf(Math.max(...node.output)),
    neighbors: [] as { id: string; index: number; target: number; distance: number }[],
    path,
    distanceCount: 0,
  };
}
