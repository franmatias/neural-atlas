import { DataError } from '@/domain/data/types';
export function validateSeed(seed: number) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new DataError('SEED');
}
export function deriveSeed(seed: number, purpose: string): number {
  validateSeed(seed);
  if (!/^[a-z0-9-]+$/.test(purpose)) throw new DataError('SEED', purpose);
  let state = 2166136261;
  for (const char of `${seed}:${purpose}:v1`)
    state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return state;
}
export interface RandomSnapshot {
  state: number;
  spare: number | null;
}
export function createRandom(seed: number, purpose: string, resume?: RandomSnapshot) {
  const initial = deriveSeed(seed, purpose);
  if (
    resume &&
    (!Number.isInteger(resume.state) ||
      resume.state < 0 ||
      resume.state > 0xffffffff ||
      (resume.spare !== null && !Number.isFinite(resume.spare)))
  )
    throw new RangeError('SEED');
  let state = resume?.state ?? initial;
  let spare: number | null = resume?.spare ?? null;
  function nextUint32() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
  const uniform = () => nextUint32() / 4294967296;
  function normal(): number {
    if (spare !== null) {
      const result = spare;
      spare = null;
      return result;
    }
    const radius = Math.sqrt(-2 * Math.log(1 - uniform()));
    const angle = 2 * Math.PI * uniform();
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  }
  return { uniform, normal, nextUint32, snapshot: () => ({ state, spare }) };
}
export function shuffle<T>(values: readonly T[], seed: number, purpose: string): T[] {
  const result = [...values];
  const random = createRandom(seed, purpose);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random.uniform() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
