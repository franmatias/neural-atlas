import { describe, expect, it } from 'vitest';
import {
  activate,
  activationDerivative,
  activations,
  defaultNeuron,
  evaluateNeuron,
  type Activation,
} from '@/domain/network/neuron';
import { boundaryLine, positiveRegion } from '@/domain/network/boundary';
import {
  advanceTimeline,
  initialTimeline,
  movePhase,
  phaseDuration,
  togglePlayback,
} from '@/application/playback/timeline';
describe('neurona escalar independiente de la interfaz', () => {
  it('reproduce el ejemplo de referencia con precisión doble', () => {
    const result = evaluateNeuron({ ...defaultNeuron });
    expect(result.products).toEqual([0.4, -0.06]);
    expect(result.z).toBeCloseTo(0.44, 14);
    expect(result.a).toBeCloseTo(0.6082590307465143, 14);
    expect(result.derivative).toBeCloseTo(1 / (2 + 2 * Math.cosh(0.44)), 12);
  });
  it.each(activations)('permanece finita en extremos: %s', (kind) => {
    for (const z of [-1000, -1, 0, 1, 1000]) {
      expect(Number.isFinite(activate(z, kind))).toBe(true);
      expect(
        activationDerivative(z, kind) === null || Number.isFinite(activationDerivative(z, kind)),
      ).toBe(true);
    }
  });
  it.each([
    ['sigmoid', 0, 0.5],
    ['tanh', 0, 0],
    ['relu', -2, 0],
    ['relu', 2, 2],
    ['leakyRelu', -2, -0.02],
    ['leakyRelu', 2, 2],
    ['linear', -2, -2],
    ['step', -0.001, 0],
    ['step', 0, 1],
  ] as const)('%s(%s) = %s', (kind, z, result) => expect(activate(z, kind)).toBe(result));
  it.each(['sigmoid', 'tanh', 'relu', 'leakyRelu', 'linear'] as const)(
    'derivada de %s coincide con diferencia central fuera de puntos angulosos',
    (kind) => {
      for (const z of [-1.3, 0.7]) {
        const h = 1e-5;
        expect(activationDerivative(z, kind)).toBeCloseTo(
          (activate(z + h, kind) - activate(z - h, kind)) / (2 * h),
          8,
        );
      }
    },
  );
  it('documenta convenciones y parámetros inválidos', () => {
    expect(activationDerivative(0, 'relu')).toBe(0);
    expect(activationDerivative(0, 'step')).toBeNull();
    expect(() => activate(NaN, 'sigmoid')).toThrow(RangeError);
    expect(() => activate(1, 'other' as Activation)).toThrow(RangeError);
    for (const key of ['x1', 'x2', 'w1', 'w2', 'b'] as const)
      expect(() => evaluateNeuron({ ...defaultNeuron, [key]: Infinity })).toThrow(RangeError);
    expect(() => evaluateNeuron({ ...defaultNeuron, x1: 2.01 })).toThrow(RangeError);
  });
});
describe('frontera y región afín', () => {
  it.each([
    { w1: 1, w2: 0, b: 0 },
    { w1: 0, w2: 1, b: 0 },
    { w1: 1, w2: 1, b: 0 },
    { w1: -0.5, w2: 0.3, b: 0.1 },
  ])('recorta una recta válida: %o', (plane) => {
    const boundary = boundaryLine(plane);
    expect(boundary.kind).toBe('line');
    if (boundary.kind === 'line')
      for (const [x, y] of boundary.points) {
        expect(Math.abs(x)).toBeLessThanOrEqual(2);
        expect(Math.abs(y)).toBeLessThanOrEqual(2);
        expect(plane.w1 * x + plane.w2 * y + plane.b).toBeCloseTo(0, 12);
      }
  });
  it('distingue salida constante, fuera del plano y esquina sin segmento', () => {
    expect(boundaryLine({ w1: 0, w2: 0, b: 0 })).toEqual({ kind: 'constant' });
    expect(boundaryLine({ w1: 1, w2: 1, b: 5 })).toEqual({ kind: 'outside' });
    expect(boundaryLine({ w1: 1, w2: 1, b: 4 })).toEqual({ kind: 'outside' });
  });
  it('el sesgo desplaza sin girar y las entradas no afectan a la frontera', () => {
    const a = boundaryLine({ w1: 1, w2: 0, b: 0 });
    const b = boundaryLine({ w1: 1, w2: 0, b: 1 });
    expect(a).toEqual({
      kind: 'line',
      points: [
        [0, -2],
        [0, 2],
      ],
    });
    expect(b).toEqual({
      kind: 'line',
      points: [
        [-1, -2],
        [-1, 2],
      ],
    });
  });
  it('sombrea solo puntos del semiplano positivo', () => {
    for (const plane of [
      { w1: 1, w2: 0, b: 0 },
      { w1: -1, w2: 1, b: 0.5 },
      { w1: 0, w2: 1, b: 8 },
    ]) {
      const polygon = positiveRegion(plane);
      expect(polygon.length).toBeGreaterThanOrEqual(3);
      for (const [x, y] of polygon)
        expect(plane.w1 * x + plane.w2 * y + plane.b).toBeGreaterThanOrEqual(-1e-12);
    }
    expect(positiveRegion({ w1: 0, w2: 0, b: 1 })).toHaveLength(4);
    expect(positiveRegion({ w1: 0, w2: 0, b: 0 })).toHaveLength(0);
    expect(positiveRegion({ w1: 0, w2: 0, b: -1 })).toHaveLength(0);
  });
});
describe('recorrido visual independiente del cálculo', () => {
  it('avanza por tiempo, conserva fracciones y termina', () => {
    let state = togglePlayback(initialTimeline());
    state = advanceTimeline(state, phaseDuration / 2, 1);
    expect(state.index).toBe(0);
    expect(state.elapsed).toBe(550);
    state = advanceTimeline(state, phaseDuration / 2, 1);
    expect(state.index).toBe(1);
    state = advanceTimeline(state, phaseDuration * 10, 4);
    expect(state).toEqual({ index: 4, elapsed: 0, playing: false });
    expect(togglePlayback(state)).toEqual({ index: 0, elapsed: 0, playing: true });
  });
  it('pausa, limita pasos e ignora tiempos o velocidades inválidas', () => {
    const playing = togglePlayback(initialTimeline());
    expect(togglePlayback(playing).playing).toBe(false);
    expect(movePhase(playing, -8)).toEqual(initialTimeline());
    expect(movePhase(playing, 8).index).toBe(4);
    expect(advanceTimeline(initialTimeline(), 1000, 1)).toEqual(initialTimeline());
    for (const delta of [-1, 0, NaN]) expect(advanceTimeline(playing, delta, 1)).toBe(playing);
    for (const speed of [0, 5, NaN]) expect(advanceTimeline(playing, 1000, speed)).toBe(playing);
    expect(advanceTimeline(playing, 550, 2).index).toBe(1);
  });
});
