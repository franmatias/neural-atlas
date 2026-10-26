import { z } from '@/shared/validation';
import { appVersion } from '@/shared/version';
import { configSchema, optionsSchema } from './experiment';
import { trainStudyRun } from './study-run';
import { prepareBoundedStudy } from './study-budget';
import { modelFromExperiment, predictWithModel } from './inference-model';
import { describe } from './multiseed';
export const dispersionOptions = z.strictObject({
  datasetJson: z.string().max(32 * 1024 * 1024),
  config: configSchema,
  pipelineOptions: optionsSchema,
  count: z.union([z.literal(3), z.literal(5), z.literal(10)]),
  firstSeed: z.number().int().min(0).max(0xffffffff),
  testPreviouslyConsulted: z.boolean(),
  hypothesis: z.string().max(2000),
});
export type DispersionOptions = z.infer<typeof dispersionOptions>;
export function predictionDispersion(raw: DispersionOptions) {
  const options = dispersionOptions.parse(raw);
  const s = prepareBoundedStudy(
    options.datasetJson,
    options.config,
    options.pipelineOptions,
    options.count,
  );
  const runs = Array.from({ length: options.count }, (_, i) =>
    trainStudyRun(
      s.dataset,
      s.split,
      { ...options.config, seed: (options.firstSeed + i) >>> 0 },
      `Semilla ${(options.firstSeed + i) >>> 0}`,
      options.pipelineOptions,
      options.testPreviouslyConsulted,
    ),
  );
  const models = runs.map((r) => modelFromExperiment(r.experiment));
  const rows = new Map(s.dataset.rows.map((row) => [row.id, row]));
  const probes = s.split.validation.map((id) => {
    const row = rows.get(id)!;
    const predictions = models.map((model) => {
      const out = predictWithModel(
        model,
        Object.fromEntries(model.features.map((f) => [f.id, row.features[f.id]!])),
      ).output;
      return model.task === 'binary' ? [1 - out[0]!, out[0]!] : out;
    });
    return {
      id,
      features: row.features,
      target: row.target,
      predictions,
      outputs: predictions[0]!.map((_, i) => describe(predictions.map((p) => p[i]!))),
    };
  });
  return {
    options,
    runs,
    probes,
    task: s.dataset.task,
    classOrder: s.dataset.classOrder ?? [],
    provenance: {
      dataHash: s.split.dataHash,
      splitHash: s.split.splitHash,
      pipelineHash: s.source.input.pipelineHash,
    },
    budget: s.budget,
    testEvaluatedInStudy: false as const,
  };
}
export type DispersionResult = ReturnType<typeof predictionDispersion>;
export function exportDispersion(result: DispersionResult) {
  const { datasetJson: _datasetJson, ...options } = result.options;
  void _datasetJson;
  return JSON.stringify(
    {
      format: 'neural-atlas.prediction-dispersion-report',
      schemaVersion: 1,
      appVersion,
      scope: 'training-seed-fixed-data',
      options,
      task: result.task,
      classOrder: result.classOrder,
      provenance: result.provenance,
      probes: result.probes,
      runs: result.runs.map((r) => ({
        label: r.label,
        config: r.experiment.config,
        selectedEpoch: r.experiment.checkpoint.epoch,
        updates: r.experiment.checkpoint.updates,
      })),
      budget: result.budget,
      testEvaluatedInStudy: false,
    },
    null,
    2,
  );
}
