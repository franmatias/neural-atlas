import { forward, type Network } from './model';
import { transformRow, type PipelineState } from '@/domain/data/pipeline';
export type SurfacePoint = { x: number; y: number; probabilities: number[]; predicted: number };
export function decisionAt(
  model: Network,
  pipeline: PipelineState,
  x: number,
  y: number,
): SurfacePoint {
  const input = transformRow(
    { id: 'probe', features: { x1: x, x2: y }, target: null, origin: 'manual' },
    pipeline,
  );
  const out = Array.from(forward(model, input).activations.at(-1)!);
  const probabilities = model.spec.task === 'binary' ? [1 - out[0]!, out[0]!] : out;
  const predicted =
    model.spec.task === 'binary'
      ? Number(out[0]! >= 0.5)
      : probabilities.indexOf(Math.max(...probabilities));
  return { x, y, probabilities, predicted };
}
/** Bounded raw-coordinate grid; all values come from one immutable model snapshot. */
export function decisionSurface(
  model: Network,
  pipeline: PipelineState,
  resolution = 30,
  extent = 1.8,
) {
  if (
    !Number.isInteger(resolution) ||
    resolution < 8 ||
    resolution > 48 ||
    !Number.isFinite(extent) ||
    extent <= 0 ||
    extent > 10
  )
    throw new RangeError('SURFACE_BUDGET');
  const step = (2 * extent) / resolution;
  const cells = Array.from({ length: resolution * resolution }, (_, i) =>
    decisionAt(
      model,
      pipeline,
      -extent + ((i % resolution) + 0.5) * step,
      -extent + (Math.floor(i / resolution) + 0.5) * step,
    ),
  );
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let y = 0; y < resolution; y++)
    for (let x = 0; x < resolution; x++) {
      const p = cells[y * resolution + x]!;
      if (x + 1 < resolution && p.predicted !== cells[y * resolution + x + 1]!.predicted)
        edges.push({
          x1: p.x + step / 2,
          y1: p.y - step / 2,
          x2: p.x + step / 2,
          y2: p.y + step / 2,
        });
      if (y + 1 < resolution && p.predicted !== cells[(y + 1) * resolution + x]!.predicted)
        edges.push({
          x1: p.x - step / 2,
          y1: p.y + step / 2,
          x2: p.x + step / 2,
          y2: p.y + step / 2,
        });
    }
  return { cells, edges, resolution, extent, step };
}
