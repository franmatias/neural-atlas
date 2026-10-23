import { z } from '@/shared/validation';
import { hashValue } from '@/domain/data/integrity';
import {
  definitionHash,
  evidenceSchema,
  optionsSchema,
  evaluateRule,
  type WorkshopDefinition,
  type WorkshopEvidence,
} from './contracts';
const answers = z
  .record(z.string().regex(/^[a-z0-9-]{1,40}$/), z.string().max(2000))
  .refine((v) => Object.keys(v).length <= 5);
const attempt = z.strictObject({
  answers,
  hints: z.array(z.string().max(60)).max(20),
  evidence: evidenceSchema.optional(),
  selfScore: z.number().int().min(0).max(3),
  endedAt: z.iso.datetime(),
});
export const progressSchema = z.strictObject({
  schemaVersion: z.literal(1),
  definitionHash: z.string().length(64),
  step: z.number().int().min(0).max(5),
  answers,
  hints: z.array(z.string().max(60)).max(20),
  solutions: z.array(z.string().max(40)).max(5),
  options: optionsSchema,
  evidence: evidenceSchema.optional(),
  attempts: z.array(attempt).max(10),
  selfScore: z.number().int().min(0).max(3),
  updatedAt: z.iso.datetime(),
  startedAt: z.iso.datetime(),
});
export type WorkshopProgress = z.infer<typeof progressSchema>;
export function validateProgress(definition: WorkshopDefinition, raw: unknown): WorkshopProgress {
  const progress = progressSchema.parse(raw);
  if (
    progress.definitionHash !== definitionHash(definition) ||
    Object.keys(progress.answers).some((id) => !definition.steps.some((step) => step.id === id))
  )
    throw new Error('WORKSHOP_VERSION');
  const validateEvidence = (evidence: WorkshopEvidence) => {
    if (
      evidence.caseId !== definition.caseId ||
      evidence.configHash !==
        hashValue({ caseId: evidence.caseId, options: evidence.options, engineVersion: 1 })
    )
      throw new Error('WORKSHOP_EVIDENCE');
  };
  for (const old of progress.attempts) if (old.evidence) validateEvidence(old.evidence);
  if (progress.evidence) {
    validateEvidence(progress.evidence);
    if (hashValue(progress.options) !== hashValue(progress.evidence.options))
      throw new Error('WORKSHOP_CONFIG');
  }
  if (progress.step >= 3 && !progress.evidence) throw new Error('WORKSHOP_EVIDENCE');
  for (const step of definition.steps.slice(0, progress.step)) {
    if (
      !step.rules.every((rule) =>
        evaluateRule(rule, progress.answers[step.id] ?? '', progress.evidence),
      )
    )
      throw new Error('WORKSHOP_PROGRESS');
  }
  return progress;
}
export function newProgress(
  definition: WorkshopDefinition,
  options: WorkshopProgress['options'],
): WorkshopProgress {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    definitionHash: definitionHash(definition),
    step: 0,
    answers: {},
    hints: [],
    solutions: [],
    options: optionsSchema.parse(options),
    attempts: [],
    selfScore: 0,
    updatedAt: now,
    startedAt: now,
  };
}
