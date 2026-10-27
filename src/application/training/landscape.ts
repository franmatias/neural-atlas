import { networkWire } from './network-schema';
import { z } from '@/shared/validation';
import { hashValue } from '@/domain/data/integrity';
import { cloneNetwork, type Network } from '@/domain/network/model';
import type { Samples } from '@/domain/training/session';
import type { RegressionLoss } from '@/domain/network/backprop';
import {
  surfaceKinds,
  illustrativeSurface,
  frozenSurface,
  parameterEntries,
  sampleSurface,
  traceSurface,
  type Bounds,
} from '@/domain/training/landscape';
import { appVersion } from '@/shared/version';
export const landscapeSchema = z.strictObject({
  mode: z.enum(['illustrative', 'frozen']),
  kind: z.enum(surfaceKinds),
  resolution: z.number().int().min(10).max(60),
  steps: z.number().int().min(1).max(300),
  rate: z.number().finite().min(1e-5).max(1),
  clip: z.number().finite().min(0).max(100),
  start: z.tuple([z.number().finite(), z.number().finite()]),
  radius: z.number().finite().min(0.1).max(5),
  axes: z.tuple([z.number().int().min(0).max(511), z.number().int().min(0).max(511)]),
});
export type LandscapeOptions = z.infer<typeof landscapeSchema>;
export const defaultLandscapeOptions: LandscapeOptions = {
  mode: 'illustrative',
  kind: 'bowl',
  resolution: 25,
  steps: 80,
  rate: 0.03,
  clip: 0,
  start: [-1.2, 1],
  radius: 2,
  axes: [0, 1],
};
export interface FrozenCut {
  model: Network;
  samples: Samples;
  loss: RegressionLoss;
  source: string;
  update: number;
}
export interface LandscapeRequest {
  options: LandscapeOptions;
  frozen?: FrozenCut;
}
export function studyLandscape({ options: raw, frozen }: LandscapeRequest) {
  const options = landscapeSchema.parse(raw);
  let surface = illustrativeSurface(options.kind),
    bounds: Bounds = [-2, 2, -2, 2];
  let provenance: FrozenCut | undefined;
  if (options.mode === 'frozen') {
    if (!frozen) throw new RangeError('NO_FROZEN_MODEL');
    provenance = {
      ...frozen,
      model: cloneNetwork(frozen.model),
      samples: structuredClone(frozen.samples),
    };
    surface = frozenSurface(provenance.model, provenance.samples, options.axes, provenance.loss);
    const entries = parameterEntries(provenance.model),
      cx = entries[options.axes[0]]!.value,
      cy = entries[options.axes[1]]!.value;
    bounds = [cx - options.radius, cx + options.radius, cy - options.radius, cy + options.radius];
  }
  const operations =
    (options.resolution ** 2 + 4 * (options.steps + 1) * 5) *
    (provenance ? parameterEntries(provenance.model).length * provenance.samples.x.length : 1);
  if (operations > 20_000_000) throw new RangeError('LANDSCAPE_BUDGET');
  const grid = sampleSurface(surface, bounds, options.resolution);
  const paths = (['sgd', 'momentum', 'rmsprop', 'adam'] as const).map((kind) =>
    traceSurface(surface, bounds, options.start, kind, options.rate, options.steps, options.clip),
  );
  return {
    options,
    grid,
    paths,
    provenance,
    sourceHash: provenance
      ? hashValue({ ...provenance, model: networkWire(provenance.model) })
      : null,
    estimatedOperations: operations,
  };
}
export type LandscapeResult = ReturnType<typeof studyLandscape>;
export function exportLandscape(result: LandscapeResult) {
  return JSON.stringify(
    {
      format: 'neural-atlas.landscape-report',
      schemaVersion: 1,
      appVersion,
      ...result,
      provenance: result.provenance
        ? { ...result.provenance, model: networkWire(result.provenance.model) }
        : undefined,
      gradientMethod: result.options.mode === 'frozen' ? 'centered difference h=1e-4' : 'analytic',
      limitations: [
        'Two-coordinate motion only, not full-network training',
        'Stationarity is not proof of a minimum',
        'Frozen cut: data loss only, no regularization/dropout, frozen inference BN',
        'No validation/test used',
      ],
    },
    null,
    2,
  );
}
