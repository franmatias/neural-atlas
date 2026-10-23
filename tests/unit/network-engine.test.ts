import { describe, expect, it } from 'vitest';
import {
  createNetwork,
  defaultSpec,
  dimensions,
  parameterCount,
  forward,
  softmax,
  softmaxJacobian,
  cloneNetwork,
  stableNorm,
  validateNetwork,
  validateSpec,
} from '@/domain/network/model';
import {
  backward,
  batchGradient,
  applyGradient,
  checkGradient,
  outputLoss,
} from '@/domain/network/backprop';
import {
  xorInputs,
  xorTargets,
  xorDemonstration,
  solveXor,
  trainPerceptron,
  perceptronScore,
  makeBatches,
} from '@/domain/network/learning';
import { activationChain, histogram, inspectNetwork } from '@/domain/network/inspection';
import { activate, activationDerivative } from '@/domain/network/neuron';
import { handleDataJob } from '@/application/data/jobs';
describe('MLP: dimensiones y representación fila [out,in]', () => {
  it('cuenta redes sin ocultas y la topología máxima documentada', () => {
    expect(parameterCount({ ...defaultSpec, hidden: [] })).toBe(3);
    expect(
      parameterCount({
        ...defaultSpec,
        inputs: 32,
        hidden: [64, 64, 64, 64, 64, 64],
        task: 'multiclass',
        classes: 10,
      }),
    ).toBe(23562);
    expect(dimensions({ ...defaultSpec, hidden: [2], task: 'multiclass', classes: 3 })).toEqual([
      2, 2, 3,
    ]);
  });
  it.each(['zero', 'xavier', 'he'] as const)(
    'inicialización %s reproducible, sesgos cero e independencia',
    (method) => {
      const a = createNetwork(defaultSpec, 42, method),
        b = createNetwork(defaultSpec, 42, method);
      expect(a).toEqual(b);
      expect(a.layers[0]!.biases).toEqual(new Float64Array(4));
      const copy = cloneNetwork(a);
      copy.layers[0]!.weights[0] = 99;
      expect(a.layers[0]!.weights[0]).not.toBe(99);
      if (method === 'zero') expect([...a.layers[0]!.weights].every((v) => v === 0)).toBe(true);
      if (method === 'xavier')
        expect([...a.layers[0]!.weights].every((v) => Math.abs(v) <= 1)).toBe(true);
    },
  );
  it.each([
    { inputs: 0 },
    { inputs: 33 },
    { inputs: 1.5 },
    { hidden: [0] },
    { hidden: [65] },
    { hidden: [1, 1, 1, 1, 1, 1, 1] },
    { activation: 'step' },
    { activation: 'bad' },
    { task: 'bad' },
    { classes: 1 },
    { classes: 11 },
    { classes: 2.5 },
    { alpha: 0 },
    { alpha: 0.4 },
    { alpha: NaN },
  ])('rechaza arquitectura %j', (patch) =>
    expect(() => validateSpec({ ...defaultSpec, ...patch } as typeof defaultSpec)).toThrow(
      'ARCHITECTURE',
    ),
  );
  it('rechaza inicialización, seed y modelos incoherentes antes del cálculo', () => {
    expect(() => createNetwork(defaultSpec, 1, 'bad' as 'he')).toThrow();
    expect(() => createNetwork(defaultSpec, -1)).toThrow();
    const a = createNetwork(defaultSpec, 1);
    expect(() => validateNetwork({ ...a, version: 2 } as unknown as typeof a)).toThrow('SHAPE');
    expect(() => validateNetwork({ ...a, layers: [] })).toThrow('SHAPE');
    for (const patch of [
      { inputs: 3 },
      { outputs: 8 },
      { weights: new Float64Array(1) },
      { biases: new Float64Array(1) },
      { activation: 'relu' },
    ])
      expect(() =>
        validateNetwork({
          ...a,
          layers: [{ ...a.layers[0]!, ...patch } as (typeof a.layers)[0], a.layers[1]!],
        }),
      ).toThrow('SHAPE');
    a.layers[0]!.weights[0] = Infinity;
    expect(() => forward(a, [0, 1])).toThrow('NON_FINITE');
    expect(() => forward(createNetwork(defaultSpec, 1), [0])).toThrow('SHAPE');
    expect(() => forward(createNetwork(defaultSpec, 1), [NaN, 0])).toThrow('NON_FINITE');
    const overflow = createNetwork({ ...defaultSpec, hidden: [], task: 'regression' }, 1);
    overflow.layers[0]!.weights.fill(1e308);
    expect(() => forward(overflow, [10, 10])).toThrow('NON_FINITE');
  });
  it('produce la solución constructiva XOR y logits conocidos sin redondear', () => {
    const model = xorDemonstration();
    expect(xorInputs.map((x) => forward(model, x).activations.at(-1)![0])).toEqual(xorTargets);
    const linear = createNetwork({ ...defaultSpec, hidden: [], task: 'regression' }, 1, 'zero');
    linear.layers[0]!.weights.set([2, -3]);
    linear.layers[0]!.biases[0] = 0.5;
    expect(forward(linear, [4, 2]).activations.at(-1)![0]).toBe(2.5);
  });
  it('softmax estable, invariante a traslación y Jacobiano completo', () => {
    expect([...softmax([1000, 1000, -1000])]).toEqual([0.5, 0.5, 0]);
    expect([...softmax([-1, 0, 1])]).toEqual([...softmax([999, 1000, 1001])]);
    const j = softmaxJacobian([0, 0]);
    expect(j).toEqual([
      [0.25, -0.25],
      [-0.25, 0.25],
    ]);
    const logits = [0.3, -0.4, 1.2],
      eps = 1e-5;
    const matrix = softmaxJacobian(logits);
    matrix.forEach((row, i) =>
      row.forEach((v, k) => {
        const p = [...logits],
          m = [...logits];
        p[k]! += eps;
        m[k]! -= eps;
        expect(v).toBeCloseTo((softmax(p)[i]! - softmax(m)[i]!) / (2 * eps), 8);
      }),
    );
    for (const v of [[], [0], Array(11).fill(0), [NaN, 0]]) expect(() => softmax(v)).toThrow();
    expect(stableNorm([1e200, 1e200])).toBeCloseTo(Math.SQRT2 * 1e200, -185);
    expect(stableNorm([0, 0])).toBe(0);
    expect(stableNorm([3, 4])).toBe(5);
  });
});
describe('backprop y pérdida: oráculos numéricos independientes', () => {
  it.each(['binary', 'multiclass', 'regression'] as const)(
    'todos los pesos y sesgos en %s pasan diferencias centradas',
    (task) => {
      const model = createNetwork({ ...defaultSpec, hidden: [3, 2], task, classes: 3 }, 7);
      const report = checkGradient(model, [0.8, 0.2], task === 'multiclass' ? 2 : 1);
      expect(report.length).toBe(parameterCount(model.spec));
      expect(Math.max(...report.map((r) => r.relativeError))).toBeLessThan(1e-7);
      expect(report.every((r) => !r.atKink)).toBe(true);
    },
  );
  it.each(['linear', 'sigmoid', 'tanh', 'relu', 'leakyRelu'] as const)(
    'derivada oculta %s consistente fuera de quiebres',
    (activation) => {
      const model = createNetwork({ ...defaultSpec, hidden: [2], activation }, 123);
      expect(
        Math.max(
          ...checkGradient(model, [0.8, -0.3], 1)
            .filter((r) => !r.atKink)
            .map((r) => r.relativeError),
        ),
      ).toBeLessThan(1e-6);
    },
  );
  it('BCE/logits extremos, CE, MSE y MAE no confunden factores', () => {
    const model = createNetwork({ ...defaultSpec, hidden: [] }, 42, 'zero');
    model.layers[0]!.biases[0] = 1000;
    expect(backward(model, [0, 0], 0).loss).toBe(1000);
    expect(backward(model, [0, 0], 1).loss).toBe(0);
    model.layers[0]!.biases[0] = -1000;
    expect(backward(model, [0, 0], 1).loss).toBe(1000);
    const m = createNetwork(
      { ...defaultSpec, hidden: [], task: 'multiclass', classes: 3 },
      1,
      'zero',
    );
    expect(backward(m, [0, 0], 2).loss).toBeCloseTo(Math.log(3));
    const r = createNetwork({ ...defaultSpec, hidden: [], task: 'regression' }, 1, 'zero');
    expect(backward(r, [1, 2], 3).loss).toBe(9);
    expect([...backward(r, [1, 2], 3).gradient[0]!.weights]).toEqual([-6, -12]);
    expect(backward(r, [1, 2], 3, 'mae').loss).toBe(3);
    expect([...backward(r, [1, 2], 3, 'mae').gradient[0]!.weights]).toEqual([-1, -2]);
    expect(backward(r, [1, 2], 0, 'mae').gradient[0]!.biases[0]).toBe(0);
    expect(checkGradient(r, [1, 2], 3, 'mae').every((v) => v.relativeError < 1e-6)).toBe(true);
    expect(checkGradient(r, [1, 2], 0, 'mae').some((v) => v.atKink)).toBe(true);
    const relu = createNetwork({ ...defaultSpec, hidden: [2], activation: 'relu' }, 1, 'zero');
    expect(checkGradient(relu, [1, 1], 1).some((v) => v.atKink)).toBe(true);
  });
  it('promedia batch una sola vez y actualiza inmutablemente después de backward', () => {
    const m = createNetwork({ ...defaultSpec, hidden: [2] }, 7);
    const a = backward(m, [0, 0], 0),
      b = backward(m, [1, 1], 1),
      batch = batchGradient(
        m,
        [
          [0, 0],
          [1, 1],
        ],
        [0, 1],
      );
    expect(batch.loss).toBe((a.loss + b.loss) / 2);
    batch.gradient.forEach((g, i) =>
      g.weights.forEach((v, j) =>
        expect(v).toBe((a.gradient[i]!.weights[j]! + b.gradient[i]!.weights[j]!) / 2),
      ),
    );
    const before = cloneNetwork(m);
    const next = applyGradient(m, batch.gradient, 0.1);
    expect(m).toEqual(before);
    expect(
      batchGradient(
        next,
        [
          [0, 0],
          [1, 1],
        ],
        [0, 1],
      ).loss,
    ).toBeLessThan(batch.loss);
    expect(next.layers[0]!.weights[0]).toBe(
      m.layers[0]!.weights[0]! - 0.1 * batch.gradient[0]!.weights[0]!,
    );
  });
  it('bloquea targets, formas, presupuestos y actualizaciones no finitas', () => {
    const m = createNetwork(defaultSpec, 1);
    for (const target of [2, NaN]) expect(() => backward(m, [0, 0], target)).toThrow('TARGET');
    const multi = createNetwork({ ...defaultSpec, task: 'multiclass' }, 1);
    for (const target of [-1, 2, 0.5])
      expect(() => backward(multi, [0, 0], target)).toThrow('TARGET');
    expect(() => outputLoss(m, forward(m, [0, 0]), 0, 'bad' as 'mse')).toThrow();
    expect(() => batchGradient(m, [], [])).toThrow();
    expect(() => batchGradient(m, [[0, 0]], [])).toThrow();
    for (const rate of [0, 2, NaN]) expect(() => applyGradient(m, [], rate)).toThrow('UPDATE');
    expect(() =>
      applyGradient(
        m,
        [
          { weights: [], biases: [] },
          { weights: [], biases: [] },
        ],
        0.1,
      ),
    ).toThrow('SHAPE');
    const g = backward(m, [0, 0], 0).gradient;
    g[0]!.weights[0] = NaN;
    expect(() => applyGradient(m, g, 0.1)).toThrow('NON_FINITE');
    for (const eps of [0, NaN, 1])
      expect(() => checkGradient(m, [0, 0], 0, 'mse', eps)).toThrow('EPSILON');
    expect(() =>
      checkGradient(createNetwork({ ...defaultSpec, hidden: [64, 64] }, 1), [0, 0], 0),
    ).toThrow('BUDGET');
    const huge = createNetwork({ ...defaultSpec, hidden: [], task: 'regression' }, 1, 'zero');
    expect(() => backward(huge, [1e200, 1e200], 1e200)).toThrow('NON_FINITE');
  });
});
describe('aprendizaje y visualización verificables', () => {
  it.each([7, 42, 123])('MLP XOR converge con seed %i', (seed) => {
    const solution = solveXor(seed);
    expect(solution.correct).toBe(4);
    expect(solution.loss).toBeLessThan(0.03);
    expect(solution.epochs).toBeLessThanOrEqual(6000);
    expect(solution.history.length).toBeGreaterThan(1);
  });
  it('Rosenblatt converge en AND y no promete resolver XOR', () => {
    const result = trainPerceptron(xorInputs, [0, 0, 0, 1], 42);
    expect(result.converged).toBe(true);
    expect(result.best.correct).toBe(4);
    const xor = trainPerceptron(xorInputs, xorTargets, 42, 0.1, 30);
    expect(xor.converged).toBe(false);
    expect(xor.best.correct).toBeLessThan(4);
    expect(xor.epochs).toBe(30);
    expect(perceptronScore(xorInputs, xorTargets, [1, 1], -0.5)).toBe(3);
    expect(() => solveXor(42, 0)).toThrow('BUDGET');
    expect(solveXor(42, 1).epochs).toBe(1);
    for (const [x, y, rate, epochs] of [
      [[], [], 0.1, 1],
      [[[0], [1, 2]], [0, 1], 0.1, 1],
      [[[NaN]], [0], 0.1, 1],
      [[[0]], [2], 0.1, 1],
      [[[0]], [0], 0, 1],
      [[[0]], [0], 0.1, 1001],
    ] as const)
      expect(() =>
        trainPerceptron(x as unknown as number[][], y as unknown as number[], 42, rate, epochs),
      ).toThrow();
  });
  it('los lotes cubren cada ID una vez, incluyen cola y dependen de época', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `r${i}`);
    const batches = makeBatches(ids, 6, 42, 0);
    expect(batches.map((b) => b.length)).toEqual([6, 6, 6, 2]);
    expect(new Set(batches.flat())).toEqual(new Set(ids));
    expect(makeBatches(ids, 6, 42, 0)).toEqual(batches);
    expect(makeBatches(ids, 6, 42, 1)).not.toEqual(batches);
    for (const [values, size, epoch] of [
      [[], 1, 0],
      [['a', 'a'], 1, 0],
      [['a'], 0, 0],
      [['a'], 2, 0],
      [['a'], 1, -1],
    ] as const)
      expect(() => makeBatches(values, size, 42, epoch)).toThrow('BATCH');
  });
  it('cadena de derivadas, ceros explícitos y step no diferenciable', () => {
    expect(activationChain(0, 'sigmoid', 20).at(-1)!.gradient).toBeLessThan(1e-12);
    expect(activationChain(-1, 'relu', 2).at(-1)!.gradient).toBe(0);
    expect(activationChain(-1, 'relu', 2).at(-1)!.logGradient).toBe(-Infinity);
    expect(activationChain(0, 'step', 2)[0]!.gradient).toBeNull();
    expect(activationChain(0, 'step', 2)[1]!.logGradient).toBeNull();
    expect(activationDerivative(0, 'leakyRelu', 0.2)).toBe(0.2);
    expect(activate(-2, 'leakyRelu', 0.2)).toBe(-0.4);
    expect(() => activate(1, 'relu', 0)).toThrow();
    for (const n of [0, 21, 1.5]) expect(() => activationChain(0, 'linear', n)).toThrow('CHAIN');
  });
  it('mapas profundos calculan forward del snapshot e histogramas conservan recuentos', () => {
    const model = createNetwork({ ...defaultSpec, hidden: [3, 2] }, 42);
    const result = inspectNetwork(model, [0.8, 0.2], 1, 1, 1, 5);
    for (const c of result.cells)
      expect(c.value).toBe(forward(model, [c.x, c.y]).activations[2]![1]);
    expect(result.layers[0]!.weights.counts.reduce((a, b) => a + b)).toBe(6);
    expect(histogram([0, 0], 3).counts).toEqual([0, 2, 0]);
    for (const values of [[], [NaN]]) expect(() => histogram(values)).toThrow();
    for (const bins of [0, 101]) expect(() => histogram([1], bins)).toThrow();
    for (const [l, n, r] of [
      [-1, 0, 5],
      [3, 0, 5],
      [0, -1, 5],
      [0, 9, 5],
      [0, 0, 2],
    ])
      expect(() => inspectNetwork(model, [0, 0], 0, l!, n!, r!)).toThrow('SELECTION');
    expect(
      inspectNetwork(createNetwork({ ...defaultSpec, inputs: 1 }, 1), [0], 0, 0, 0, 5).cells,
    ).toHaveLength(25);
  });
  it('ejecuta los nuevos casos en el manejador independiente del Worker', () => {
    expect(
      handleDataJob(1, {
        kind: 'inspectNetwork',
        payload: {
          model: createNetwork(defaultSpec, 1),
          input: [0, 0],
          target: 0,
          layer: 0,
          neuron: 0,
        },
      }).ok,
    ).toBe(true);
    expect(
      handleDataJob(2, {
        kind: 'perceptron',
        payload: { inputs: xorInputs, targets: xorTargets, seed: 1, rate: 0.1, epochs: 1 },
      }).ok,
    ).toBe(true);
    expect(handleDataJob(3, { kind: 'solveXor', payload: { seed: 1, epochs: 1 } }).ok).toBe(true);
  });
});
