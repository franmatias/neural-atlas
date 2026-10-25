import { createRandom, validateSeed } from '@/domain/random/seeded';
import type { Dataset, Sample } from './types';
export type AugmentationPolicy = 'circles' | 'xor';
export interface AugmentationConfig {
  policy: AugmentationPolicy;
  sigma: number;
  copies: number;
  seed: number;
}
export interface AugmentationExample {
  parentId: string;
  label: string;
  attempts: number;
  status: 'accepted' | 'invalid-source' | 'attempts-exhausted';
  original?: [number, number];
  transformed?: [number, number];
  copyId?: string;
}
export interface AugmentationReport {
  policy: AugmentationPolicy;
  seed: number;
  sigma: number;
  copiesPerParent: number;
  originals: number;
  requested: number;
  accepted: number;
  rejected: number;
  attempts: number;
  invalidSources: number;
  exhausted: number;
  preview: AugmentationExample[];
}
export function validateAugmentation(c: AugmentationConfig) {
  validateSeed(c.seed);
  if (
    !['circles', 'xor'].includes(c.policy) ||
    !Number.isFinite(c.sigma) ||
    c.sigma < 0 ||
    c.sigma > 0.01 ||
    !Number.isInteger(c.copies) ||
    c.copies < 1 ||
    c.copies > 3
  )
    throw new RangeError('AUGMENTATION_CONFIG');
}
export function augmentationOracle(policy: AugmentationPolicy, x: number, y: number) {
  return policy === 'circles'
    ? { label: Math.hypot(x, y) < 0.5 ? '1' : '0', margin: Math.abs(Math.hypot(x, y) - 0.5) }
    : { label: x * y < 0 ? '1' : '0', margin: Math.min(Math.abs(x), Math.abs(y)) };
}
export function supportedAugmentation(dataset: Dataset): AugmentationPolicy | undefined {
  const id = dataset.recipe?.id;
  return (id === 'circles' || id === 'xor') &&
    dataset.recipe?.version === 1 &&
    dataset.task === 'binary' &&
    dataset.classOrder?.join(',') === '0,1' &&
    dataset.features.length === 2 &&
    dataset.features.every((f) => f.kind === 'numeric' && ['x1', 'x2'].includes(f.id))
    ? id
    : undefined;
}
/** Fixed train-only copies before the already-fitted pipeline. Original rows stay immutable. */
export function augmentTraining(
  dataset: Dataset,
  trainIds: string[],
  validationSize: number,
  config: AugmentationConfig,
) {
  validateAugmentation(config);
  if (supportedAugmentation(dataset) !== config.policy) throw new RangeError('AUGMENTATION_POLICY');
  if (trainIds.length * (config.copies + 1) + validationSize > 10000)
    throw new RangeError('AUGMENTATION_LIMIT');
  const rows = new Map(dataset.rows.map((row) => [row.id, row]));
  const random = createRandom(config.seed, 'augmentation');
  const copies: Sample[] = [];
  const report: AugmentationReport = {
    policy: config.policy,
    seed: config.seed,
    sigma: config.sigma,
    copiesPerParent: config.copies,
    originals: trainIds.length,
    requested: trainIds.length * config.copies,
    accepted: 0,
    rejected: 0,
    attempts: 0,
    invalidSources: 0,
    exhausted: 0,
    preview: [],
  };
  for (const [index, id] of trainIds.entries()) {
    const row = rows.get(id);
    if (!row) throw new RangeError('AUGMENTATION_POLICY');
    const x = row.features.x1,
      y = row.features.x2;
    const original: [number, number] | undefined =
      typeof x === 'number' && Number.isFinite(x) && typeof y === 'number' && Number.isFinite(y)
        ? [x, y]
        : undefined;
    const oracle = original ? augmentationOracle(config.policy, ...original) : undefined;
    const eligible =
      row.origin === 'generated' &&
      original &&
      original.every((v) => Math.abs(v) <= 1) &&
      row.annotation &&
      String(row.annotation.cleanTarget) === String(row.target) &&
      oracle?.label === String(row.target) &&
      oracle.margin >= 0.03 &&
      !row.annotation.defects.some((d) => ['label', 'outlier', 'missing'].includes(d));
    for (let copy = 1; copy <= config.copies; copy++) {
      const example: AugmentationExample = {
        parentId: id,
        label: String(row.target),
        attempts: 0,
        status: 'invalid-source',
        ...(original ? { original: [...original] } : {}),
      };
      if (!eligible) {
        report.invalidSources++;
        report.rejected++;
      } else {
        example.status = 'attempts-exhausted';
        for (let attempt = 0; attempt < 10; attempt++) {
          example.attempts++;
          report.attempts++;
          const dx = config.sigma * random.normal(),
            dy = config.sigma * random.normal();
          if (Math.hypot(dx, dy) > 0.03) continue;
          const point: [number, number] = [original[0] + dx, original[1] + dy];
          const result = augmentationOracle(config.policy, ...point);
          if (
            point.some((v) => Math.abs(v) > 1) ||
            result.label !== oracle!.label ||
            result.margin < 0.03
          )
            continue;
          const copyId = `aug-${index + 1}-${copy}`;
          if (rows.has(copyId)) throw new RangeError('AUGMENTATION_POLICY');
          copies.push({
            id: copyId,
            features: { x1: point[0], x2: point[1] },
            target: row.target,
            origin: 'augmented',
            annotation: { defects: [], cleanTarget: row.annotation!.cleanTarget, sourceId: id },
          });
          example.status = 'accepted';
          example.copyId = copyId;
          example.transformed = point;
          report.accepted++;
          break;
        }
        if (example.status !== 'accepted') {
          report.exhausted++;
          report.rejected++;
        }
      }
      if (report.preview.length < 20) report.preview.push(example);
    }
  }
  return { copies, report };
}
