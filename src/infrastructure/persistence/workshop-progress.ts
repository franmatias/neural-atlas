import { z } from '@/shared/validation';
import { appVersion } from '@/shared/version';
import { getBrowserStorage, type PreferenceStorage } from './preferences';
import type { WorkshopProgress } from '@/application/workshops/progress';
export const progressKey = 'neural-atlas:v1:progress';
const draftSchema = z.strictObject({
  definitionHash: z.string().length(64),
  step: z.number().int().min(0).max(5),
  answers: z
    .record(z.string().max(40), z.string().max(2000))
    .refine((v) => Object.keys(v).length <= 5),
  hints: z.array(z.string().max(60)).max(20),
  evidenceRefs: z.array(z.string().uuid()).max(11),
  updatedAt: z.iso.datetime(),
});
export type WorkshopDraft = z.infer<typeof draftSchema>;
const envelope = z.strictObject({
  schemaVersion: z.literal(1),
  savedAt: z.iso.datetime(),
  appVersion: z.string().max(32),
  payload: z.array(draftSchema).max(20),
});
export function readWorkshopDrafts(
  storage: PreferenceStorage | undefined = getBrowserStorage(),
): WorkshopDraft[] {
  try {
    const raw = storage?.getItem(progressKey);
    if (!raw || raw.length * 2 > 448 * 1024) return [];
    return envelope.parse(JSON.parse(raw)).payload;
  } catch {
    return [];
  }
}
export function removeWorkshopDraft(
  hash: string,
  storage: PreferenceStorage | undefined = getBrowserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      progressKey,
      JSON.stringify({
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        appVersion,
        payload: readWorkshopDrafts(storage).filter((draft) => draft.definitionHash !== hash),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
export function writeWorkshopDraft(
  progress: WorkshopProgress,
  storage: PreferenceStorage | undefined = getBrowserStorage(),
): boolean {
  if (!storage) return false;
  try {
    const drafts = readWorkshopDrafts(storage).filter(
      (old) => old.definitionHash !== progress.definitionHash,
    );
    const evidenceRefs = [
      ...progress.attempts.flatMap((attempt) => (attempt.evidence ? [attempt.evidence.id] : [])),
      ...(progress.evidence ? [progress.evidence.id] : []),
    ];
    drafts.push(
      draftSchema.parse({
        definitionHash: progress.definitionHash,
        step: progress.step,
        answers: progress.answers,
        hints: progress.hints,
        evidenceRefs,
        updatedAt: progress.updatedAt,
      }),
    );
    const text = JSON.stringify({
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      appVersion,
      payload: drafts,
    });
    if (text.length * 2 > 448 * 1024 || drafts.length > 20) return false;
    storage.setItem(progressKey, text);
    return true;
  } catch {
    return false;
  }
}
