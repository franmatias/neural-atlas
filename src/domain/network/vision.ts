export interface VisionInput {
  size: number;
  pixels: number[];
  kernelSize: number;
  kernel: number[];
  stride: number;
  padding: 'valid' | 'same';
  relu: boolean;
}
export type ImagePattern = 'seven' | 'cross' | 'diagonal' | 'border';
export function imagePattern(size: number, kind: ImagePattern) {
  if (
    !Number.isInteger(size) ||
    size < 10 ||
    size > 28 ||
    !['seven', 'cross', 'diagonal', 'border'].includes(kind)
  )
    throw new RangeError('IMAGE');
  const mid = Math.floor(size / 2);
  return Array.from({ length: size * size }, (_, i) => {
    const r = Math.floor(i / size),
      c = i % size;
    return Number(
      kind === 'seven'
        ? (r === 2 && c >= 2 && c < size - 2) ||
            (c === size - 3 - Math.floor((r - 2) / 2) && r >= 2 && r < size - 2)
        : kind === 'cross'
          ? r === mid || c === mid
          : kind === 'diagonal'
            ? r === c
            : r === 1 || c === 1 || r === size - 2 || c === size - 2,
    );
  });
}
export function kernelPattern(size: number, kind: 'identity' | 'mean' | 'edge') {
  if (![3, 5].includes(size) || !['identity', 'mean', 'edge'].includes(kind))
    throw new RangeError('KERNEL');
  return Array.from({ length: size * size }, (_, i) =>
    kind === 'mean'
      ? 1 / (size * size)
      : kind === 'identity'
        ? Number(i === Math.floor((size * size) / 2))
        : i % size === 0
          ? -1
          : i % size === size - 1
            ? 1
            : 0,
  );
}
export function rotateImage(pixels: number[], size: number) {
  if (
    pixels.length !== size * size ||
    !Number.isInteger(size) ||
    size < 10 ||
    size > 28 ||
    pixels.some((v) => !Number.isFinite(v) || v < 0 || v > 1)
  )
    throw new RangeError('IMAGE');
  return Array.from(
    { length: pixels.length },
    (_, i) => pixels[(size - 1 - (i % size)) * size + Math.floor(i / size)]!,
  );
}
export function visionShape(input: VisionInput) {
  const { size: n, kernelSize: k, stride: s } = input;
  if (
    !Number.isInteger(n) ||
    n < 10 ||
    n > 28 ||
    ![3, 5].includes(k) ||
    !Number.isInteger(s) ||
    s < 1 ||
    s > 3 ||
    !['valid', 'same'].includes(input.padding) ||
    typeof input.relu !== 'boolean' ||
    input.pixels.length !== n * n ||
    input.kernel.length !== k * k ||
    input.pixels.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
    input.kernel.some((v) => !Number.isFinite(v) || v < -5 || v > 5)
  )
    throw new RangeError('VISION_INPUT');
  const output = input.padding === 'same' ? Math.ceil(n / s) : Math.floor((n - k) / s) + 1;
  const total = input.padding === 'same' ? Math.max((output - 1) * s + k - n, 0) : 0;
  return {
    output,
    before: Math.floor(total / 2),
    after: total - Math.floor(total / 2),
    pooled: Math.floor(output / 2),
  };
}
export function inspectWindow(input: VisionInput, index: number) {
  const shape = visionShape(input);
  if (!Number.isInteger(index) || index < 0 || index >= shape.output ** 2)
    throw new RangeError('WINDOW');
  const row = Math.floor(index / shape.output),
    column = index % shape.output;
  const products = input.kernel.map((weight, i) => {
    const kr = Math.floor(i / input.kernelSize),
      kc = i % input.kernelSize,
      r = row * input.stride - shape.before + kr,
      c = column * input.stride - shape.before + kc,
      padding = r < 0 || c < 0 || r >= input.size || c >= input.size,
      value = padding ? 0 : input.pixels[r * input.size + c]!;
    return { kr, kc, row: r, column: c, padding, value, weight, product: value * weight };
  });
  const sum = products.reduce((s, p) => s + p.product, 0);
  return { index, row, column, products, sum, activation: input.relu ? Math.max(0, sum) : sum };
}
export function maxPool(values: number[], size: number) {
  if (
    !Number.isInteger(size) ||
    size < 2 ||
    values.length !== size * size ||
    !values.every(Number.isFinite)
  )
    throw new RangeError('POOL');
  const output = Math.floor(size / 2);
  const windows = Array.from({ length: output ** 2 }, (_, i) => {
    const row = Math.floor(i / output) * 2,
      column = (i % output) * 2,
      indices = [
        row * size + column,
        row * size + column + 1,
        (row + 1) * size + column,
        (row + 1) * size + column + 1,
      ],
      candidates = indices.map((index) => values[index]!);
    let winner = 0;
    for (let j = 1; j < 4; j++) if (candidates[j]! > candidates[winner]!) winner = j;
    return {
      row,
      column,
      indices,
      candidates,
      winner: indices[winner]!,
      value: candidates[winner]!,
    };
  });
  return {
    size: output,
    values: windows.map((w) => w.value),
    windows,
    discardedEdge: size % 2 === 1,
  };
}
export function correlateImage(input: VisionInput) {
  const shape = visionShape(input),
    registered = { ...input, pixels: [...input.pixels], kernel: [...input.kernel] };
  const raw = Array.from({ length: shape.output ** 2 }, (_, i) => inspectWindow(registered, i).sum),
    activation = raw.map((v) => (input.relu ? Math.max(0, v) : v));
  return { input: registered, shape, raw, activation, pool: maxPool(activation, shape.output) };
}
export type VisionResult = ReturnType<typeof correlateImage>;
