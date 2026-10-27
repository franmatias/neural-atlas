import { z } from '@/shared/validation';
import { guardJson } from '@/application/data/json-files';
import { hashValue, utf8Length } from '@/domain/data/integrity';
export const workshopIds = [
  'T01',
  'T02',
  'T03',
  'T04',
  'T05',
  'T06',
  'T07',
  'T08',
  'T09',
  'T10',
  'T11',
  'T12',
] as const;
export const metricIds = [
  'splitDisjoint',
  'fittedTrain',
  'nonFinite',
  'biasBefore',
  'biasAfter',
  'sameWeights',
  'distance',
  'linearCorrect',
  'linearExample',
  'mlpCorrect',
  'gradientError',
  'gradientPass',
  'updateApplied',
  'lossBefore',
  'lossAfter',
  'runCount',
  'recordedRuns',
  'budgetAccepted',
  'baselineLoss',
  'variantLoss',
  'baselineScore',
  'variantScore',
  'trainSupport',
  'validationSupport',
  'threshold',
  'fp',
  'fn',
  'cost',
  'groupRecallGap',
  'originalUnchanged',
  'testConsulted',
  'faultChanged',
  'repairPreservesSplit',
  'baselineNorm',
  'variantNorm',
  'baselineReferenceLoss',
  'validationRejected',
  'illustrativeHoldoutConsulted',
] as const;
const finite = z.number().finite();
export const advancedWorkshopSchema = z.strictObject({
  threshold: finite.min(0).max(1),
  lambda: finite.min(0).max(0.1),
  noise: finite.min(0).max(0.4),
  clipNorm: finite.min(0.1).max(100),
  fault: z.enum(['zero', 'rate', 'units', 'leak', 'output', 'bn', 'labels', 'relu']),
});
export const advancedWorkshopDefaults: z.infer<typeof advancedWorkshopSchema> = {
  threshold: 0.3,
  lambda: 0.01,
  noise: 0.2,
  clipNorm: 1,
  fault: 'zero',
};
export const optionsSchema = z.strictObject({
  seed: z.number().int().min(0).max(0xffffffff),
  bias: finite.min(-2).max(2),
  rate: finite.min(0.001).max(1),
  scaling: z.enum(['standard', 'minmax']),
  rates: z
    .tuple([finite.min(0.001).max(1), finite.min(0.001).max(1), finite.min(0.001).max(1)])
    .refine((v) => new Set(v).size === 3),
  batches: z
    .tuple([z.number().int().min(1).max(64), z.number().int().min(1).max(64)])
    .refine((v) => v[0] !== v[1]),
  epochs: z.number().int().min(5).max(20),
  budgetAccepted: z.boolean(),
  advanced: advancedWorkshopSchema.optional(),
});
export type WorkshopOptions = z.infer<typeof optionsSchema>;
export const defaultWorkshopOptions: WorkshopOptions = {
  seed: 42,
  bias: 0.6,
  rate: 0.1,
  scaling: 'standard',
  rates: [0.001, 0.03, 0.6],
  batches: [8, 64],
  epochs: 12,
  budgetAccepted: false,
};
const metric = z.enum(metricIds),
  short = z.string().min(1).max(2000);
const reflectionRule = (operator: 'predictOutcome' | 'compareObservation' | 'manualReflection') =>
  z.strictObject({ operator: z.literal(operator), minLength: z.number().int().min(12).max(1000) });
export const ruleSchema = z.discriminatedUnion('operator', [
  z.strictObject({ operator: z.literal('equals'), metric, value: z.union([finite, z.boolean()]) }),
  z
    .strictObject({ operator: z.literal('range'), metric, min: finite, max: finite })
    .refine((v) => v.min <= v.max),
  z.strictObject({ operator: z.literal('finite'), metrics: z.array(metric).min(1).max(18) }),
  z.strictObject({ operator: z.literal('changed'), before: metric, after: metric }),
  z.strictObject({ operator: z.literal('compareRuns'), minimum: z.number().int().min(2).max(6) }),
  z.strictObject({ operator: z.literal('splitDisjoint') }),
  reflectionRule('predictOutcome'),
  reflectionRule('compareObservation'),
  reflectionRule('manualReflection'),
]);
export const phases = ['predict', 'configure', 'execute', 'inspect', 'explain'] as const;
const stepSchema = z.strictObject({
  id: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/)
    .refine((value) => !['constructor', 'prototype'].includes(value)),
  type: z.enum(phases),
  instruction: short,
  rules: z.array(ruleSchema).max(20),
  hints: z.array(short).max(4),
  solution: short.optional(),
});
export const definitionSchema = z
  .strictObject({
    format: z.literal('neural-atlas.workshop'),
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[A-Za-z0-9-]{1,40}$/),
    contentVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
    caseId: z.enum(workshopIds),
    title: z.strictObject({ es: z.string().min(1).max(150) }),
    audience: z.string().min(1).max(150),
    estimatedMinutes: z.number().int().min(5).max(180),
    prerequisites: z.array(z.string().max(150)).max(12),
    steps: z.array(stepSchema).length(5),
    teacherGuide: short,
    rubric: z.array(short).length(4),
  })
  .refine(
    (v) =>
      new Set(v.steps.map((s) => s.id)).size === 5 && v.steps.every((s, i) => s.type === phases[i]),
    'La versión actual admite cinco fases POE ordenadas',
  )
  .refine(
    (value) =>
      value.steps[0]!.rules.some((rule) => rule.operator === 'predictOutcome') &&
      value.steps[3]!.rules.some((rule) => rule.operator === 'compareObservation') &&
      value.steps[4]!.rules.some((rule) => rule.operator === 'manualReflection'),
    'Deben registrarse hipótesis, contraste y reflexión',
  );
export type WorkshopDefinition = z.infer<typeof definitionSchema>;
export type EvidenceRule = z.infer<typeof ruleSchema>;
const point = z.strictObject({
  epoch: finite,
  update: finite,
  trainLoss: finite,
  validationLoss: finite,
  trainScore: finite,
  validationScore: finite,
  gradientNorm: finite,
  regularizationPenalty: finite.optional(),
  trainObjective: finite.optional(),
});
export const evidenceSchema = z.strictObject({
  id: z.string().uuid(),
  caseId: z.enum(workshopIds),
  engineVersion: z.literal(1),
  capturedAt: z.iso.datetime(),
  options: optionsSchema,
  configHash: z.string().length(64),
  metrics: z.partialRecord(metric, z.union([finite, z.boolean(), z.null()])),
  experiment: z
    .string()
    .max(8 * 1024 * 1024)
    .optional(),
  rows: z
    .array(
      z.strictObject({
        label: z.string().max(150),
        values: z.array(z.union([finite, z.string().max(150)])).max(8),
      }),
    )
    .max(20),
  columns: z.array(z.string().max(100)).max(8),
  curves: z
    .array(
      z.strictObject({
        label: z.string().max(150).optional(),
        scoreKind: z.enum(['accuracy', 'mse']).optional(),
        rate: finite,
        batch: finite,
        outcome: z.enum(['finite', 'divergent']),
        updates: finite,
        history: z.array(point).max(21),
      }),
    )
    .max(6),
  plot: z
    .array(z.strictObject({ x: finite, y: finite, label: z.number().int().min(0).max(1) }))
    .max(40),
});
export type WorkshopEvidence = z.infer<typeof evidenceSchema>;
export function definitionHash(definition: WorkshopDefinition) {
  return hashValue({
    ...definition,
    steps: definition.steps.map((step) =>
      Object.fromEntries(Object.entries(step).filter(([key]) => key !== 'solution')),
    ),
  });
}
export function importWorkshop(text: string): WorkshopDefinition {
  if (utf8Length(text) > 1024 * 1024) throw new Error('WORKSHOP_SIZE');
  const raw: unknown = JSON.parse(text);
  guardJson(raw);
  return definitionSchema.parse(raw);
}
export function exportWorkshop(definition: WorkshopDefinition, solutions: boolean): string {
  const next = definitionSchema.parse(definition);
  return JSON.stringify(
    {
      ...next,
      steps: next.steps.map(({ solution, ...step }) =>
        solutions && solution ? { ...step, solution } : step,
      ),
    },
    null,
    2,
  );
}
export function evaluateRule(
  rule: EvidenceRule,
  answer: string,
  evidence?: WorkshopEvidence,
): boolean {
  const metrics = evidence?.metrics ?? {};
  switch (rule.operator) {
    case 'predictOutcome':
    case 'manualReflection':
      return answer.trim().length >= rule.minLength;
    case 'compareObservation':
      return !!evidence && answer.trim().length >= rule.minLength;
    case 'equals':
      return metrics[rule.metric] === rule.value;
    case 'range': {
      const value = metrics[rule.metric];
      return typeof value === 'number' && value >= rule.min && value <= rule.max;
    }
    case 'finite':
      return rule.metrics.every(
        (key) => typeof metrics[key] === 'number' && Number.isFinite(metrics[key]),
      );
    case 'changed':
      return (
        typeof metrics[rule.before] === 'number' &&
        typeof metrics[rule.after] === 'number' &&
        metrics[rule.before] !== metrics[rule.after]
      );
    case 'compareRuns':
      return (
        ((metrics.runCount as number) ?? 0) >= rule.minimum &&
        metrics.runCount === metrics.recordedRuns
      );
    case 'splitDisjoint':
      return metrics.splitDisjoint === true;
  }
}
