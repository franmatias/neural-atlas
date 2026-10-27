import { it, expect } from 'vitest';
import {
  imagePattern,
  kernelPattern,
  rotateImage,
  visionShape,
  inspectWindow,
  maxPool,
  correlateImage,
  type VisionInput,
} from '@/domain/network/vision';
import { exportVision } from '@/application/training/vision';
function input(): VisionInput {
  return {
    size: 10,
    pixels: Array(100).fill(1),
    kernelSize: 3,
    kernel: kernelPattern(3, 'identity'),
    stride: 1,
    padding: 'same',
    relu: true,
  };
}
it('correlación asimétrica sin invertir kernel, productos y copias registradas', () => {
  const p = input();
  p.padding = 'valid';
  p.kernel = [1, 2, 3, 4, 5, 0, -1, -2, -3];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++) p.pixels[r * 10 + c] = (r * 3 + c + 1) / 10;
  const w = inspectWindow(p, 0);
  expect(w.sum).toBeCloseTo(0.5);
  expect(w.products).toHaveLength(9);
  expect(w.products[3]).toMatchObject({
    row: 1,
    column: 0,
    weight: 4,
    value: 0.4,
    product: 1.6,
    padding: false,
  });
  const result = correlateImage(p);
  expect(result.raw[0]).toBeCloseTo(0.5);
  p.pixels[0] = 0;
  p.kernel[0] = 0;
  expect(result.input.pixels[0]).toBe(0.1);
  expect(result.input.kernel[0]).toBe(1);
  const negative = correlateImage({ ...input(), kernel: Array(9).fill(-1), padding: 'valid' });
  expect(negative.raw[0]).toBe(-9);
  expect(negative.activation[0]).toBe(0);
  expect(negative.pool.values[0]).toBe(0);
  expect(
    correlateImage({ ...input(), kernel: Array(9).fill(-1), padding: 'valid', relu: false }).pool
      .values[0],
  ).toBe(-9);
});
it('dimensiones valid/same, stride y padding asimétrico son exactos', () => {
  expect(visionShape({ ...input(), padding: 'valid' })).toEqual({
    output: 8,
    before: 0,
    after: 0,
    pooled: 4,
  });
  const p = { ...input(), stride: 2 };
  expect(visionShape(p)).toEqual({ output: 5, before: 0, after: 1, pooled: 2 });
  expect(inspectWindow(p, 24).products.filter((v) => v.padding)).toHaveLength(5);
  const q = { ...input(), kernelSize: 5, kernel: kernelPattern(5, 'mean'), stride: 3 };
  expect(visionShape(q)).toEqual({ output: 4, before: 2, after: 2, pooled: 2 });
  expect(inspectWindow(q, 0).products.filter((v) => v.padding)).toHaveLength(16);
  expect(inspectWindow(q, 0).sum).toBeCloseTo(9 / 25);
  expect(visionShape({ ...q, padding: 'valid' }).output).toBe(2);
  for (const size of [10, 14, 28])
    for (const stride of [1, 2, 3])
      for (const k of [3, 5]) {
        const r = correlateImage({
          ...input(),
          size,
          pixels: imagePattern(size, 'cross'),
          stride,
          kernelSize: k,
          kernel: kernelPattern(k, 'edge'),
        });
        expect(r.raw).toHaveLength(Math.ceil(size / stride) ** 2);
        expect(r.pool.values).toHaveLength(Math.floor(Math.ceil(size / stride) / 2) ** 2);
      }
});
it('pooling desempata por primer índice y descarta bordes impares', () => {
  const p = maxPool([5, 5, 99, 5, 1, 98, 999, 999, 999], 3);
  expect(p.values).toEqual([5]);
  expect(p.windows[0]).toMatchObject({
    indices: [0, 1, 3, 4],
    winner: 0,
    candidates: [5, 5, 5, 1],
  });
  expect(p.discardedEdge).toBe(true);
  expect(maxPool([-4, -3, -2, -1], 2).windows[0]!.winner).toBe(3);
  expect(maxPool([0, 0, 0, 0], 2).discardedEdge).toBe(false);
  expect(() => maxPool([], 1)).toThrow();
  expect(() => maxPool([NaN, 0, 0, 0], 2)).toThrow();
});
it('patrones, kernels y rotación exacta sin prometer invariancia', () => {
  for (const kind of ['seven', 'cross', 'diagonal', 'border'] as const) {
    const p = imagePattern(10, kind);
    expect(p).toHaveLength(100);
    expect(p.every((v) => v === 0 || v === 1)).toBe(true);
    let rotated = p;
    for (let i = 0; i < 4; i++) rotated = rotateImage(rotated, 10);
    expect(rotated).toEqual(p);
  }
  const p = Array(100).fill(0);
  p[0] = 1;
  expect(rotateImage(p, 10)[9]).toBe(1);
  expect(kernelPattern(5, 'identity').reduce((s, v) => s + v, 0)).toBe(1);
  expect(kernelPattern(3, 'mean').reduce((s, v) => s + v, 0)).toBeCloseTo(1);
  expect(kernelPattern(3, 'edge').slice(0, 3)).toEqual([-1, 0, 1]);
  for (const f of [
    () => imagePattern(9, 'seven'),
    () => imagePattern(10, 'bad' as never),
    () => kernelPattern(4, 'edge'),
    () => kernelPattern(3, 'bad' as never),
    () => rotateImage([], 10),
    () => rotateImage(Array(100).fill(Infinity), 10),
  ])
    expect(f).toThrow();
});
it('valida tamaños, stride, valores y selección; informes preservan oráculo e integridad', () => {
  for (const patch of [
    { size: 9 },
    { size: 29 },
    { kernelSize: 4 },
    { kernel: [] },
    { pixels: [] },
    { stride: 0 },
    { stride: 4 },
    { stride: 1.1 },
    { padding: 'bad' },
    { relu: 1 },
    { pixels: Array(100).fill(-1) },
    { pixels: Array(100).fill(2) },
    { pixels: Array(100).fill(NaN) },
    { kernel: Array(9).fill(6) },
    { kernel: Array(9).fill(Infinity) },
  ])
    expect(() => visionShape({ ...input(), ...patch } as VisionInput)).toThrow();
  for (const i of [-1, 100, 1.1]) expect(() => inspectWindow(input(), i)).toThrow();
  const r = correlateImage(input()),
    report = JSON.parse(exportVision(r, 0, 0, 'Una hipótesis', 'Una reflexión'));
  expect(report.operation).toContain('no kernel flip');
  expect(report.dataHash).toHaveLength(64);
  expect(report.inspector.sum).toBe(r.raw[0]);
  expect(report.pooling.winner).toBe(0);
  expect(report.hypothesis).toBe('Una hipótesis');
  expect(() => exportVision(r, 0, 100, '', '')).toThrow();
  expect(() => exportVision(r, 0, 0, 'x'.repeat(2001), '')).toThrow();
  expect(() => exportVision(r, 0, 0, '', 'x'.repeat(2001))).toThrow();
  r.raw[0] = 999;
  expect(() => exportVision(r, 0, 0, '', '')).toThrow('VISION_REPORT');
});
