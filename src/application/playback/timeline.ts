export const phases = ['inputs', 'products', 'sum', 'activation', 'output'] as const;
export interface Timeline {
  index: number;
  elapsed: number;
  playing: boolean;
}
export const phaseDuration = 1100;
export const initialTimeline = (): Timeline => ({ index: 0, elapsed: 0, playing: false });
export function movePhase(state: Timeline, direction: number): Timeline {
  return {
    index: Math.min(phases.length - 1, Math.max(0, state.index + direction)),
    elapsed: 0,
    playing: false,
  };
}
export function togglePlayback(state: Timeline): Timeline {
  return state.playing
    ? { ...state, playing: false }
    : { index: state.index === phases.length - 1 ? 0 : state.index, elapsed: 0, playing: true };
}
export function advanceTimeline(state: Timeline, deltaMs: number, speed: number): Timeline {
  if (
    !state.playing ||
    !Number.isFinite(deltaMs) ||
    deltaMs <= 0 ||
    !Number.isFinite(speed) ||
    speed < 0.25 ||
    speed > 4
  )
    return state;
  const elapsed = state.elapsed + deltaMs * speed;
  const steps = Math.floor(elapsed / phaseDuration);
  const index = Math.min(phases.length - 1, state.index + steps);
  return {
    index,
    elapsed: index === phases.length - 1 ? 0 : elapsed % phaseDuration,
    playing: index < phases.length - 1,
  };
}
