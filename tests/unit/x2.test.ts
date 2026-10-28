import { it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { realDataset, realDatasetProvenance } from '@/application/data/real-datasets';
import { Sonification, toneFor } from '@/infrastructure/audio/sonification';
import { gradientLessons } from '@/content/gradient-lessons';
import { defaultLandscapeOptions, studyLandscape } from '@/application/training/landscape';
import { guideForPath, labGuides } from '@/content/lab-guides';
import { splitDataset } from '@/domain/data/split';
import { exportDatasetJson, importDatasetJson } from '@/application/data/json-files';
import { trainStudyRun } from '@/application/training/study-run';
import { defaultSpec } from '@/domain/network/model';
import { defaultOptimizer } from '@/domain/training/optimizer';

it('fuentes UCI intactas, medidas originales, correcciones Iris y soportes completos', () => {
  for (const [file, hash] of Object.entries(realDatasetProvenance.hashes)) {
    const bytes = readFileSync(new URL('../../src/content/datasets/raw/' + file, import.meta.url));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
  }
  for (const [id, count, width, support] of [
    ['iris', 150, 4, [50, 50, 50]],
    ['wine', 178, 13, [59, 71, 48]],
  ] as const) {
    const data = realDataset(id);
    expect(data.rows).toHaveLength(count);
    expect(data.features).toHaveLength(width);
    expect(data.classOrder!.map((c) => data.rows.filter((r) => r.target === c).length)).toEqual(
      support,
    );
    expect(data.rows.every((r) => r.origin === 'imported')).toBe(true);
    expect(new Set(data.rows.map((r) => r.id)).size).toBe(count);
    data.rows[0]!.target = 'changed';
    expect(realDataset(id).rows[0]!.target).not.toBe('changed');
  }
  expect(Object.values(realDataset('iris').rows[34]!.features)).toEqual([4.9, 3.1, 1.5, 0.2]);
  expect(Object.values(realDataset('iris').rows[37]!.features)).toEqual([4.9, 3.6, 1.4, 0.1]);
  expect(realDataset('wine').rows[0]!.features['feature-13']).toBe(1065);
  expect(() => realDataset('invalid' as never)).toThrow('REAL_DATASET_ID');
});
it('Iris y Wine conservan todas las columnas al exportar y entrenan con train separado', () => {
  for (const id of ['iris', 'wine'] as const) {
    const dataset = realDataset(id),
      split = splitDataset(dataset, {
        strategy: 'stratified',
        seed: 42,
        ratios: [0.7, 0.15, 0.15],
      });
    expect(importDatasetJson(exportDatasetJson(dataset, split))).toEqual({ dataset, split });
    const run = trainStudyRun(
      dataset,
      split,
      {
        spec: {
          ...defaultSpec,
          inputs: dataset.features.length,
          hidden: [4],
          task: 'multiclass',
          classes: 3,
        },
        seed: 42,
        initialization: 'xavier',
        optimizer: { ...defaultOptimizer },
        epochs: 2,
        batchSize: 16,
        loss: 'mse',
      },
      id,
    );
    expect(run.trainingRows).toBe(split.train.length);
    expect(run.experiment.checkpoint.epoch).toBe(2);
    expect(run.experiment.config.spec.inputs).toBe(dataset.features.length);
    expect(run.experiment.testConsulted).toBe(false);
    expect(Number.isFinite(run.experiment.checkpoint.history.at(-1)!.validationLoss)).toBe(true);
  }
});

function audio() {
  const parameter = () => ({
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  });
  const oscillator = {
    frequency: parameter(),
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: '',
  };
  const gain = { gain: parameter(), connect: vi.fn() };
  const context = {
    currentTime: 0,
    destination: {},
    createOscillator: () => oscillator,
    createGain: () => gain,
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
  };
  return { oscillator, gain, context, factory: () => context as unknown as AudioContext };
}
it('mapas de sonido acotados con escala logarítmica explícita', () => {
  expect(toneFor(0, 'output')!.frequency).toBe(220);
  expect(toneFor(1, 'output')!.frequency).toBe(880);
  expect(toneFor(0.5, 'output')!.frequency).toBe(550);
  expect(toneFor(0.5, 'output', 'grave')!.frequency).toBe(275);
  expect(toneFor(0.5, 'output', 'agudo')!.frequency).toBe(1100);
  expect(toneFor(1, 'loss', 'invalid' as never)).toBeUndefined();
  expect(toneFor(-1, 'output')!.clamped).toBe(true);
  expect(toneFor(2, 'output')!.clamped).toBe(true);
  expect(toneFor(0.001, 'loss')!.frequency).toBeCloseTo(352);
  expect(toneFor(-1, 'loss')!.frequency).toBe(220);
  expect(toneFor(100, 'loss')!.frequency).toBe(880);
  expect(toneFor(NaN, 'loss')).toBeUndefined();
  expect(toneFor(1, 'bad' as never)).toBeUndefined();
});
it('audio requiere inicio explícito, limita volumen y silencia inmediatamente', async () => {
  const a = audio(),
    engine = new Sonification(a.factory, () => true);
  engine.update(1, 'output', 0.1);
  expect(a.oscillator.start).not.toHaveBeenCalled();
  expect(await engine.start(0.5, 'output', 9)).toBe(true);
  expect(a.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.2, 0, 0.015);
  engine.update(0.2, 'output', -1);
  expect(a.gain.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.015);
  engine.stop();
  expect(engine.active).toBe(false);
  expect(a.gain.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
  expect(a.context.close).toHaveBeenCalledOnce();
  engine.update(1, 'output', 0.1);
  expect(a.oscillator.start).toHaveBeenCalledOnce();
});
it('ocultar pestaña, datos inválidos, cancelación durante resume y errores no reactivan sonido', async () => {
  for (const invalid of [NaN, Infinity]) {
    const a = audio(),
      e = new Sonification(a.factory, () => true);
    expect(await e.start(invalid, 'loss', 0.1)).toBe(false);
    expect(await e.start(1, 'loss', invalid)).toBe(false);
    await e.start(1, 'loss', 0.1);
    e.update(invalid, 'loss', 0.1);
    expect(e.active).toBe(false);
    await e.start(1, 'loss', 0.1);
    e.update(1, 'loss', invalid);
    expect(e.active).toBe(false);
  }
  let visible = false;
  const a = audio(),
    e = new Sonification(a.factory, () => visible);
  expect(await e.start(1, 'output', 0.1)).toBe(false);
  visible = true;
  await e.start(1, 'output', 0.1);
  visible = false;
  e.update(1, 'output', 0.1);
  expect(e.active).toBe(false);
  let resume!: () => void;
  a.context.resume.mockImplementation(
    () =>
      new Promise<void>((r) => {
        resume = r;
      }),
  );
  visible = true;
  const pending = e.start(1, 'output', 0.1);
  e.stop();
  resume();
  expect(await pending).toBe(false);
  const pendingHidden = e.start(1, 'output', 0.1);
  visible = false;
  resume();
  expect(await pendingHidden).toBe(false);
  visible = true;
  a.context.resume.mockRejectedValue(Error('blocked'));
  expect(await e.start(1, 'output', 0.1)).toBe(false);
  const broken = new Sonification(
    () => {
      throw Error('unavailable');
    },
    () => true,
  );
  expect(await broken.start(1, 'output', 0.1)).toBe(false);
  a.context.resume.mockResolvedValue();
  a.oscillator.stop.mockImplementation(() => {
    throw Error('not started');
  });
  a.context.close.mockRejectedValue(Error('closed'));
  expect(await e.start(1, 'output', 0.1)).toBe(true);
  e.stop();
  vi.stubGlobal('AudioContext', function () {
    return a.context;
  });
  const browser = new Sonification();
  await browser.start(1, 'output', 0.1);
  browser.stop();
  vi.unstubAllGlobals();
});
it('ejemplos guiados concuerdan con el motor y explican casos distintos', () => {
  const result = (id: string) =>
    studyLandscape({
      options: { ...defaultLandscapeOptions, ...gradientLessons.find((x) => x.id === id)!.patch },
    });
  const p = result('first-step').paths[0]!.points;
  expect(p[0]!.gradient).toEqual([2, 6]);
  expect(p[0]!.loss).toBe(4);
  expect(p[1]!.x).toBeCloseTo(0.8);
  expect(p[1]!.y).toBeCloseTo(0.4);
  expect(p[1]!.loss).toBeCloseTo(1.12);
  expect(result('oscillation').paths[0]!.points[1]!.y).toBeLessThan(0);
  expect(result('divergence').paths[0]!.status).toBe('outside');
  expect(result('saddle').paths[0]!.status).toBe('stationary');
  expect(result('valley').paths[0]!.points.length).toBeGreaterThan(1);
  expect(labGuides).toHaveLength(19);
  expect(guideForPath('/lab/arquitectura/frontera')!.path).toBe('arquitectura/frontera');
  expect(guideForPath('/lab/experimentos/robustez')!.path).toBe('experimentos');
  expect(guideForPath('/glosario')).toBeUndefined();
});
