import { createRandom, shuffle } from '@/domain/random/seeded';
import { DataError, recipeIds, type Dataset, type GeneratorOptions, type Sample } from './types';
import { validateDataset } from './validation';
export function generateDataset(options: GeneratorOptions): Dataset {
  if (
    !recipeIds.includes(options.recipe) ||
    !Number.isInteger(options.count) ||
    options.count < 20 ||
    options.count > 10000
  )
    throw new DataError('OPTIONS');
  for (const [key, max] of [
    ['noise', 1],
    ['outliers', 0.2],
    ['labelNoise', 0.3],
    ['missing', 0.3],
    ['duplicates', 0.2],
  ] as const)
    if (!Number.isFinite(options[key]) || options[key] < 0 || options[key] > max)
      throw new DataError('OPTIONS', key);
  if (!Number.isFinite(options.minority) || options.minority < 0.05 || options.minority > 0.5)
    throw new DataError('OPTIONS', 'minority');
  const rng = createRandom(options.seed, 'generation');
  const noise = createRandom(options.seed, 'defects-noise');
  const outliers = createRandom(options.seed, 'defects-outliers');
  const labelsRng = createRandom(options.seed, 'defects-labels');
  const missing = createRandom(options.seed, 'defects-missing');
  const duplicates = createRandom(options.seed, 'defects-duplicates');
  const regression = options.recipe === 'energy' || options.recipe === 'sine';
  const classes = options.recipe === 'flowers' ? 3 : 2;
  const duplicateCount = Math.floor(options.count * options.duplicates);
  const baseCount = options.count - duplicateCount;
  const minorityCount = Math.round(baseCount * options.minority);
  const labels = shuffle(
    Array.from({ length: baseCount }, (_, i) =>
      classes === 3 ? i % 3 : i < minorityCount ? 1 : 0,
    ),
    options.seed,
    'generation-labels',
  );
  const rows: Sample[] = [];
  for (let i = 0; i < baseCount; i++) {
    const label = labels[i]!;
    let x = 0;
    let y = 0;
    let target: string | number = String(label);
    const angle = rng.uniform() * Math.PI * 2;
    switch (options.recipe) {
      case 'clouds':
        x = (label ? 0.55 : -0.55) + 0.18 * rng.normal();
        y = (label ? 0.35 : -0.35) + 0.18 * rng.normal();
        break;
      case 'moons': {
        const t = rng.uniform() * Math.PI;
        x = label ? 1 - Math.cos(t) - 0.5 : Math.cos(t) - 0.5;
        y = label ? 0.3 - Math.sin(t) : Math.sin(t) - 0.3;
        break;
      }
      case 'circles': {
        const radius = label ? 0.25 + 0.12 * rng.uniform() : 0.65 + 0.15 * rng.uniform();
        x = radius * Math.cos(angle);
        y = radius * Math.sin(angle);
        break;
      }
      case 'xor': {
        x = (rng.uniform() * 0.8 + 0.1) * (rng.uniform() > 0.5 ? 1 : -1);
        y = (rng.uniform() * 0.8 + 0.1) * (label ? -Math.sign(x) : Math.sign(x));
        break;
      }
      case 'spirals': {
        const radius = 0.1 + 0.8 * rng.uniform();
        const t = radius * Math.PI * 3 + label * Math.PI;
        x = radius * Math.cos(t);
        y = radius * Math.sin(t);
        break;
      }
      case 'flowers':
        x = 0.4 * label + 0.15 * rng.normal();
        y = 0.5 * Math.sin(label * 2) + 0.15 * rng.normal();
        break;
      case 'energy':
        x = rng.uniform();
        y = rng.uniform();
        target = 40 + 35 * x + 20 * y;
        break;
      case 'sine':
        x = rng.uniform() * 2 - 1;
        y = rng.uniform() * 2 - 1;
        target = Math.sin(Math.PI * x) + 0.25 * y;
        break;
    }
    const cleanTarget = target;
    const tags: NonNullable<Sample['annotation']>['defects'] = [];
    if (options.noise > 0) {
      if (regression)
        target =
          Number(target) + options.noise * (options.recipe === 'energy' ? 20 : 1) * noise.normal();
      else {
        x += options.noise * noise.normal();
        y += options.noise * noise.normal();
      }
      tags.push('noise');
    }
    if (outliers.uniform() < options.outliers) {
      x += (outliers.uniform() > 0.5 ? 1 : -1) * (2 + 3 * outliers.uniform());
      y += (outliers.uniform() > 0.5 ? 1 : -1) * (2 + 3 * outliers.uniform());
      tags.push('outlier');
    }
    if (!regression && labelsRng.uniform() < options.labelNoise) {
      target = String((label + 1 + Math.floor(labelsRng.uniform() * (classes - 1))) % classes);
      tags.push('label');
    }
    const features: Sample['features'] = {
      x1: options.recipe === 'energy' ? 1000 * x : x,
      x2: options.recipe === 'energy' ? 10 * y : y,
    };
    if (options.recipe === 'flowers')
      features.zone = ['norte', 'sur', 'este'][Math.floor(rng.uniform() * 3)]!;
    for (const key of Object.keys(features))
      if (missing.uniform() < options.missing) {
        features[key] = null;
        if (!tags.includes('missing')) tags.push('missing');
      }
    rows.push({
      id: `r-${i + 1}`,
      features,
      target,
      origin: 'generated',
      annotation: { defects: tags, cleanTarget },
    });
  }
  for (let i = 0; i < duplicateCount; i++) {
    const source = rows[Math.floor(duplicates.uniform() * baseCount)]!;
    source.groupId = `g-${source.id}`;
    rows.push({
      ...source,
      id: `dup-${i + 1}`,
      features: { ...source.features },
      annotation: {
        defects: [...source.annotation!.defects, 'duplicate'],
        cleanTarget: source.annotation!.cleanTarget,
        sourceId: source.id,
      },
    });
  }
  const dataset: Dataset = {
    id: `synthetic-${options.recipe}-${options.seed}`,
    revision: 1,
    task: regression ? 'regression' : classes === 3 ? 'multiclass' : 'binary',
    targetName: regression ? 'consumo' : 'clase',
    features: [
      {
        id: 'x1',
        name: options.recipe === 'energy' ? 'Superficie' : 'x₁',
        kind: 'numeric',
        ...(options.recipe === 'energy' ? { unit: 'm²' } : {}),
      },
      {
        id: 'x2',
        name: options.recipe === 'energy' ? 'Ocupación' : 'x₂',
        kind: 'numeric',
        ...(options.recipe === 'energy' ? { unit: 'personas' } : {}),
      },
    ],
    rows,
    recipe: { id: options.recipe, version: 1, seed: options.seed, options: { ...options } },
    ...(regression ? {} : { classOrder: Array.from({ length: classes }, (_, i) => String(i)) }),
  };
  if (options.recipe === 'flowers')
    dataset.features.push({ id: 'zone', name: 'Zona', kind: 'categorical' });
  validateDataset(dataset);
  return dataset;
}
