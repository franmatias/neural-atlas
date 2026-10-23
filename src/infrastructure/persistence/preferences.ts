export type Theme = 'system' | 'light' | 'dark';
export type ExplanationLevel = 'intuition' | 'steps' | 'formal';
export interface Preferences {
  theme: Theme;
  presentation: boolean;
  level: ExplanationLevel;
  speed: number;
  motion: 'system' | 'reduced';
}
export const preferencesKey = 'neural-atlas:v1:preferences';
export const defaults: Readonly<Preferences> = {
  theme: 'system',
  presentation: false,
  level: 'intuition',
  speed: 1,
  motion: 'system',
};
export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function getBrowserStorage(): PreferenceStorage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
export function validatePreferences(input: unknown): Preferences {
  const p = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  return {
    theme: p.theme === 'light' || p.theme === 'dark' ? p.theme : 'system',
    presentation: p.presentation === true,
    level: p.level === 'steps' || p.level === 'formal' ? p.level : 'intuition',
    speed:
      typeof p.speed === 'number' && Number.isFinite(p.speed) && p.speed >= 0.25 && p.speed <= 4
        ? p.speed
        : 1,
    motion: p.motion === 'reduced' ? 'reduced' : 'system',
  };
}
export function readPreferences(storage: PreferenceStorage | undefined): Preferences {
  try {
    const raw: unknown = JSON.parse(storage?.getItem(preferencesKey) ?? 'null');
    if (
      typeof raw !== 'object' ||
      raw === null ||
      !('schemaVersion' in raw) ||
      raw.schemaVersion !== 1 ||
      !('payload' in raw)
    )
      return { ...defaults };
    return validatePreferences(raw.payload);
  } catch {
    return { ...defaults };
  }
}
export function writePreferences(
  storage: PreferenceStorage | undefined,
  preferences: Preferences,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(
      preferencesKey,
      JSON.stringify({
        schemaVersion: 1,
        appVersion: '0.5.0',
        payload: validatePreferences(preferences),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
