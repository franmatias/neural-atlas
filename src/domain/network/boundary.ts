export type Point = readonly [number, number];
export interface AffinePlane {
  w1: number;
  w2: number;
  b: number;
}
export type Boundary =
  { kind: 'constant' } | { kind: 'outside' } | { kind: 'line'; points: readonly [Point, Point] };
const corners: Point[] = [
  [-2, -2],
  [2, -2],
  [2, 2],
  [-2, 2],
];
const epsilon = 1e-10;
export function boundaryLine({ w1, w2, b }: AffinePlane): Boundary {
  if (w1 === 0 && w2 === 0) return { kind: 'constant' };
  const points: Point[] = [];
  function add(x: number, y: number) {
    if (
      Math.abs(x) <= 2 + epsilon &&
      Math.abs(y) <= 2 + epsilon &&
      !points.some((p) => Math.hypot(p[0] - x, p[1] - y) < epsilon)
    )
      points.push([Math.max(-2, Math.min(2, x)) || 0, Math.max(-2, Math.min(2, y)) || 0]);
  }
  if (w2 !== 0) {
    add(-2, (2 * w1 - b) / w2);
    add(2, (-2 * w1 - b) / w2);
  }
  if (w1 !== 0) {
    add((2 * w2 - b) / w1, -2);
    add((-2 * w2 - b) / w1, 2);
  }
  const first = points[0];
  const second = points[1];
  return first && second ? { kind: 'line', points: [first, second] } : { kind: 'outside' };
}
/** Sutherland–Hodgman clipping against z >= 0; used only to shade the input plane. */
export function positiveRegion(plane: AffinePlane): Point[] {
  if (plane.w1 === 0 && plane.w2 === 0) return plane.b > 0 ? [...corners] : [];
  const result: Point[] = [];
  const z = (p: Point) => plane.w1 * p[0] + plane.w2 * p[1] + plane.b;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i]!;
    const b = corners[(i + 1) % corners.length]!;
    const za = z(a);
    const zb = z(b);
    if (za >= 0) result.push(a);
    if ((za < 0 && zb > 0) || (za > 0 && zb < 0)) {
      const ratio = za / (za - zb);
      result.push([a[0] + ratio * (b[0] - a[0]), a[1] + ratio * (b[1] - a[1])]);
    }
  }
  return result;
}
