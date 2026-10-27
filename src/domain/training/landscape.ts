import {
  createNetwork,
  defaultSpec,
  type Network,
  cloneNetwork,
  forward,
  validateNetwork,
} from '@/domain/network/model';
import { outputLoss, type RegressionLoss } from '@/domain/network/backprop';
import { createOptimizer, defaultOptimizer, optimizerStep, type OptimizerKind } from './optimizer';
import { exhaust } from './kernel';
import type { Samples } from './session';
export const surfaceKinds = ['bowl', 'saddle', 'wells', 'rosenbrock'] as const;
export type SurfaceKind = (typeof surfaceKinds)[number];
export type Pair = [number, number];
export type Bounds = [number, number, number, number];
export interface Surface {
  value(x: number, y: number): number;
  gradient(x: number, y: number): Pair;
}
export function illustrativeSurface(kind: SurfaceKind): Surface {
  if (!surfaceKinds.includes(kind)) throw new RangeError('SURFACE');
  return {
    value: (x, y) =>
      kind === 'bowl'
        ? x * x + 3 * y * y
        : kind === 'saddle'
          ? x * x - y * y
          : kind === 'wells'
            ? (x * x - 1) ** 2 + y * y
            : (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    gradient: (x, y) =>
      kind === 'bowl'
        ? [2 * x, 6 * y]
        : kind === 'saddle'
          ? [2 * x, -2 * y]
          : kind === 'wells'
            ? [4 * x * (x * x - 1), 2 * y]
            : [2 * (x - 1) - 400 * x * (y - x * x), 200 * (y - x * x)],
  };
}
export function parameterEntries(model: Network) {
  return model.layers.flatMap((l, layer) => [
    ...Array.from(l.weights, (value, index) => ({
      label: `C${layer + 1} · w[${Math.floor(index / l.inputs) + 1},${(index % l.inputs) + 1}]`,
      value,
      layer,
      kind: 'weights' as const,
      index,
    })),
    ...Array.from(l.biases, (value, index) => ({
      label: `C${layer + 1} · b[${index + 1}]`,
      value,
      layer,
      kind: 'biases' as const,
      index,
    })),
  ]);
}
export function frozenSurface(
  model: Network,
  samples: Samples,
  axes: Pair,
  loss: RegressionLoss,
): Surface {
  validateNetwork(model);
  const entries = parameterEntries(model);
  if (
    entries.length > 512 ||
    axes[0] === axes[1] ||
    axes.some((a) => !Number.isInteger(a) || !entries[a]) ||
    !samples.x.length ||
    samples.x.length > 64 ||
    samples.y.length !== samples.x.length ||
    samples.ids.length !== samples.x.length
  )
    throw new RangeError('CUT');
  // Validate every target and input before scheduling the grid.
  samples.x.forEach((x, i) => outputLoss(model, forward(model, x), samples.y[i]!, loss));
  const copy = cloneNetwork(model);
  function value(x: number, y: number) {
    [x, y].forEach((v, i) => {
      const e = entries[axes[i]!]!;
      copy.layers[e.layer]![e.kind][e.index] = v;
    });
    return samples.x.reduce(
      (sum, input, i) =>
        sum + outputLoss(copy, forward(copy, input), samples.y[i]!, loss).value / samples.x.length,
      0,
    );
  }
  const h = 1e-4;
  return {
    value,
    gradient: (x, y) => [
      (value(x + h, y) - value(x - h, y)) / (2 * h),
      (value(x, y + h) - value(x, y - h)) / (2 * h),
    ],
  };
}
export interface LandscapePoint {
  step: number;
  x: number;
  y: number;
  loss: number;
  gradient: Pair;
  applied: Pair;
  norm: number;
}
export interface LandscapePath {
  kind: OptimizerKind;
  points: LandscapePoint[];
  status: 'budget' | 'stationary' | 'outside' | 'nonfinite';
  rejected?: Pair;
}
export function inside([x, y]: Pair, [xmin, xmax, ymin, ymax]: Bounds) {
  return x >= xmin && x <= xmax && y >= ymin && y <= ymax;
}
export function traceSurface(
  surface: Surface,
  bounds: Bounds,
  start: Pair,
  kind: OptimizerKind,
  rate: number,
  steps: number,
  clip: number,
): LandscapePath {
  if (
    !inside(start, bounds) ||
    !['sgd', 'momentum', 'rmsprop', 'adam'].includes(kind) ||
    !Number.isFinite(rate) ||
    rate < 1e-5 ||
    rate > 1 ||
    !Number.isInteger(steps) ||
    steps < 1 ||
    steps > 300 ||
    !Number.isFinite(clip) ||
    clip < 0 ||
    clip > 100
  )
    throw new RangeError('PATH');
  let model = createNetwork({ ...defaultSpec, hidden: [], task: 'regression' }, 42, 'zero');
  model.layers[0]!.weights.set(start);
  let state = createOptimizer(model);
  const result: LandscapePath = { kind, points: [], status: 'budget' };
  for (let step = 0; step <= steps; step++) {
    const x = model.layers[0]!.weights[0]!,
      y = model.layers[0]!.weights[1]!;
    let loss: number, gradient: Pair;
    try {
      loss = surface.value(x, y);
      gradient = surface.gradient(x, y);
    } catch {
      result.status = 'nonfinite';
      break;
    }
    if (![loss, ...gradient].every(Number.isFinite)) {
      result.status = 'nonfinite';
      break;
    }
    const norm = Math.hypot(...gradient),
      factor = clip > 0 && norm > clip ? clip / norm : 1,
      applied: Pair = [gradient[0] * factor, gradient[1] * factor];
    result.points.push({ step, x, y, loss, gradient, applied, norm });
    if (norm < 1e-6) {
      result.status = 'stationary';
      break;
    }
    if (step === steps) break;
    try {
      const next = exhaust(
        optimizerStep(
          model,
          state,
          [Float64Array.from(applied), Float64Array.of(0)],
          { ...defaultOptimizer, kind, rate },
          rate,
        ),
      );
      const candidate: Pair = [
        next.model.layers[0]!.weights[0]!,
        next.model.layers[0]!.weights[1]!,
      ];
      if (!inside(candidate, bounds)) {
        result.status = 'outside';
        result.rejected = candidate;
        break;
      }
      model = next.model;
      state = next.optimizer;
    } catch {
      result.status = 'nonfinite';
      break;
    }
  }
  return result;
}
export function sampleSurface(surface: Surface, bounds: Bounds, resolution: number) {
  if (
    !Number.isInteger(resolution) ||
    resolution < 10 ||
    resolution > 60 ||
    !bounds.every(Number.isFinite) ||
    bounds[0] >= bounds[1] ||
    bounds[2] >= bounds[3]
  )
    throw new RangeError('GRID');
  const values = Array.from({ length: resolution ** 2 }, (_, i) =>
    surface.value(
      bounds[0] + ((i % resolution) / (resolution - 1)) * (bounds[1] - bounds[0]),
      bounds[2] + (Math.floor(i / resolution) / (resolution - 1)) * (bounds[3] - bounds[2]),
    ),
  );
  if (!values.every(Number.isFinite)) throw new RangeError('GRID_NON_FINITE');
  return { resolution, bounds, values, min: Math.min(...values), max: Math.max(...values) };
}
