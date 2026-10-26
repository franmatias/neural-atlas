import { z } from '@/shared/validation';
import { createRandom } from '@/domain/random/seeded';
import { activate } from '@/domain/network/neuron';
import { hashValue } from '@/domain/data/integrity';
import {
  auditGroups,
  auditHistogram,
  compareGroupPolicies,
  type AuditRow,
} from '@/domain/training/group-audit';
import { appVersion } from '@/shared/version';
export const auditScenarioSchema = z
  .strictObject({
    seed: z.number().int().min(0).max(4294967295),
    count1: z.number().int().min(0).max(400),
    count2: z.number().int().min(0).max(400),
    prevalence1: z.number().finite().min(0).max(1),
    prevalence2: z.number().finite().min(0).max(1),
    noise1: z.number().finite().min(0).max(2.5),
    noise2: z.number().finite().min(0).max(2.5),
    offset1: z.number().finite().min(-2).max(2),
    offset2: z.number().finite().min(-2).max(2),
  })
  .refine((v) => v.count1 + v.count2 >= 20, { message: 'At least twenty audit rows' });
export type AuditScenarioOptions = z.infer<typeof auditScenarioSchema>;
export const defaultAuditScenario: AuditScenarioOptions = {
  seed: 42,
  count1: 360,
  count2: 40,
  prevalence1: 0.12,
  prevalence2: 0.6,
  noise1: 0.5,
  noise2: 1.8,
  offset1: 0,
  offset2: -1.3,
};
export const auditPresetNames = {
  aggregate: 'Exactitud global alta, errores concentrados',
  comparable: 'Medición y prevalencia comparables',
  prevalence: 'Prevalencias distintas, misma medición',
  absent: 'Canal 2 sin representación',
  noPositives: 'Canal 2 sin positivos de referencia',
  noNegatives: 'Canal 2 sin negativos de referencia',
} as const;
export type AuditPreset = keyof typeof auditPresetNames;
const comparable = {
  ...defaultAuditScenario,
  count1: 200,
  count2: 200,
  prevalence1: 0.35,
  prevalence2: 0.35,
  noise1: 0.8,
  noise2: 0.8,
  offset1: 0,
  offset2: 0,
};
export const auditPresets: Record<AuditPreset, AuditScenarioOptions> = {
  aggregate: defaultAuditScenario,
  comparable,
  prevalence: { ...comparable, prevalence1: 0.15, prevalence2: 0.65 },
  absent: { ...comparable, count2: 0 },
  noPositives: { ...comparable, prevalence2: 0 },
  noNegatives: { ...comparable, prevalence2: 1 },
};
export interface AuditCohort {
  recipeVersion: 1;
  options: AuditScenarioOptions;
  rows: AuditRow[];
  dataHash: string;
}
export function generateAuditCohort(raw: AuditScenarioOptions): AuditCohort {
  const options = auditScenarioSchema.parse(raw),
    rows: AuditRow[] = [];
  for (const group of auditGroups) {
    const count = group === 'G1' ? options.count1 : options.count2,
      prevalence = group === 'G1' ? options.prevalence1 : options.prevalence2,
      sigma = group === 'G1' ? options.noise1 : options.noise2,
      offset = group === 'G1' ? options.offset1 : options.offset2;
    const labels = createRandom(options.seed, `audit-labels-${group.toLowerCase()}`),
      sensor = createRandom(options.seed, `audit-sensor-${group.toLowerCase()}`);
    for (let i = 0; i < count; i++) {
      const actual = Number(labels.uniform() < prevalence),
        measurement = 1.8 * (2 * actual - 1) + offset + sigma * sensor.normal();
      rows.push({
        id: `audit-${group}-${i}`,
        group,
        actual,
        measurement,
        score: activate(measurement, 'sigmoid'),
      });
    }
  }
  return {
    recipeVersion: 1,
    options,
    rows,
    dataHash: hashValue({ recipeVersion: 1, options, rows }),
  };
}
const threshold = z.number().finite().min(0).max(1),
  cost = z.number().finite().min(0).max(20);
export const auditSettingsSchema = z.strictObject({
  reference: threshold,
  alternative: threshold,
  separated: z.boolean(),
  group1: threshold,
  group2: threshold,
  costs: z.strictObject({
    G1: z.strictObject({ fp: cost, fn: cost }),
    G2: z.strictObject({ fp: cost, fn: cost }),
  }),
});
export type AuditSettings = z.infer<typeof auditSettingsSchema>;
export function defaultAuditSettings(): AuditSettings {
  return {
    reference: 0.5,
    alternative: 0.5,
    separated: false,
    group1: 0.5,
    group2: 0.5,
    costs: { G1: { fp: 1, fn: 5 }, G2: { fp: 2, fn: 8 } },
  };
}
export function analyzeAudit(cohort: AuditCohort, raw: AuditSettings) {
  const settings = auditSettingsSchema.parse(raw);
  const reference = { G1: settings.reference, G2: settings.reference },
    alternative = {
      G1: settings.separated ? settings.group1 : settings.alternative,
      G2: settings.separated ? settings.group2 : settings.alternative,
    };
  return {
    settings,
    thresholds: { reference, alternative },
    ...compareGroupPolicies(cohort.rows, reference, alternative, settings.costs),
  };
}
export const auditReflectionSchema = z.strictObject({
  evidence: z.string().max(2000),
  context: z.string().max(2000),
  action: z.string().max(2000),
});
export type AuditReflection = z.infer<typeof auditReflectionSchema>;
export function exportAuditReport(
  cohort: AuditCohort,
  settings: AuditSettings,
  hypothesis: string,
  reflection: AuditReflection,
) {
  if (
    cohort.dataHash !== hashValue({ recipeVersion: 1, options: cohort.options, rows: cohort.rows })
  )
    throw new Error('AUDIT_INTEGRITY');
  return JSON.stringify(
    {
      format: 'neural-atlas.group-audit-report',
      schemaVersion: 1,
      appVersion,
      context:
        'Fictional educational-resource review; synthetic channel groups, no real personal data',
      targetMeaning: 'Synthetic reference label: 1 marked for review, not real need or merit',
      scoreRule:
        'sigmoid(measurement), fixed toy rule, not a trained network or calibrated probability',
      sampleRole: 'synthetic audit cohort; not train, validation or final test',
      recipeVersion: 1,
      dataHash: cohort.dataHash,
      options: cohort.options,
      rows: cohort.rows,
      hypothesis: z.string().max(2000).parse(hypothesis),
      reflection: auditReflectionSchema.parse(reflection),
      analysis: analyzeAudit(cohort, settings),
      histograms: { G1: auditHistogram(cohort.rows, 'G1'), G2: auditHistogram(cohort.rows, 'G2') },
      limitations: [
        'Descriptive differences, not a fairness or suitability certificate',
        'No causal inference or privacy guarantee',
        'Costs and reference labels are exercise assumptions',
        'No policy is automatically recommended or optimized',
      ],
    },
    null,
    2,
  );
}
