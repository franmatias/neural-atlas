import { appVersion } from '@/shared/version';
import { hashValue } from '@/domain/data/integrity';
import { correlateImage, inspectWindow, type VisionResult } from '@/domain/network/vision';
export function exportVision(
  result: VisionResult,
  index: number,
  pooling: number,
  hypothesis: string,
  reflection: string,
) {
  const calculated = correlateImage(result.input);
  if (
    hashValue(calculated) !== hashValue(result) ||
    !Number.isInteger(pooling) ||
    !result.pool.windows[pooling] ||
    hypothesis.length > 2000 ||
    reflection.length > 2000
  )
    throw new RangeError('VISION_REPORT');
  return JSON.stringify(
    {
      format: 'neural-atlas.vision-report',
      schemaVersion: 1,
      appVersion,
      operation: 'cross-correlation, no kernel flip',
      dataHash: hashValue(result.input),
      result,
      inspector: inspectWindow(result.input, index),
      pooling: result.pool.windows[pooling],
      hypothesis,
      reflection,
      limitations: [
        'Fixed filters; no trained CNN or digit classifier',
        'Zero padding and dropped odd pooling edges are explicit',
        'Rotation is an experiment, not proof of invariance',
      ],
    },
    null,
    2,
  );
}
