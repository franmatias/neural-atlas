import { z } from '@/shared/validation';
import { conceptIdSchema } from './concept';
const monthDays = (y: number, m: number) =>
  [
    31,
    y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][m - 1] ?? 0;
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const [y, m, d] = value.split('-').map(Number);
    return y! >= 1 && m! >= 1 && m! <= 12 && d! >= 1 && d! <= monthDays(y!, m!);
  });
function addDays(today: string, days: number) {
  let [y, m, d] = today.split('-').map(Number) as [number, number, number];
  for (let i = 0; i < days; i++) {
    d++;
    if (d > monthDays(y, m)) {
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }
  return [String(y).padStart(4, '0'), String(m).padStart(2, '0'), String(d).padStart(2, '0')].join(
    '-',
  );
}
export const reviewSchema = z.strictObject({
  conceptId: conceptIdSchema,
  contentVersion: z.number().int().positive(),
  box: z.number().int().min(0).max(5),
  due: day,
  responses: z.array(z.strictObject({ day, correct: z.boolean() })).max(5),
  visited: z.boolean(),
  explained: z.boolean(),
  reviewed: z.boolean(),
});
export type Review = z.infer<typeof reviewSchema>;
export function newReview(conceptId: string, contentVersion: number, today: string): Review {
  return reviewSchema.parse({
    conceptId,
    contentVersion,
    box: 0,
    due: today,
    responses: [],
    visited: false,
    explained: false,
    reviewed: false,
  });
}
export function gradeReview(previous: Review, correct: boolean, today: string): Review {
  day.parse(today);
  const box = correct ? Math.min(5, previous.box + 1) : 0;

  return reviewSchema.parse({
    ...previous,
    box,
    due: addDays(today, [1, 1, 3, 7, 14, 30][box]!),
    reviewed: true,
    responses: [...previous.responses, { day: today, correct }].slice(-5),
  });
}
