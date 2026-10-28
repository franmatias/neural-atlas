import { it, expect, vi } from 'vitest';
import { Sonification } from '@/infrastructure/audio/sonification';
it('un backend que no resuelve resume termina en dos segundos y no puede sonar después', async () => {
  vi.useFakeTimers();
  try {
    let resume!: () => void;
    const start = vi.fn(),
      close = vi.fn(async () => {}),
      parameter = {
        setValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      };
    const context = {
      currentTime: 0,
      destination: {},
      close,
      resume: () =>
        new Promise<void>((r) => {
          resume = r;
        }),
      createOscillator: () => ({ frequency: parameter, connect: vi.fn(), start, stop: vi.fn() }),
      createGain: () => ({ gain: parameter, connect: vi.fn() }),
    };
    const audio = new Sonification(
      () => context as unknown as AudioContext,
      () => true,
    );
    const pending = audio.start(0.5, 'output', 0.1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toBe(false);
    expect(audio.active).toBe(false);
    expect(close).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    resume();
    await Promise.resolve();
    expect(start).not.toHaveBeenCalled();
  } finally {
    vi.useRealTimers();
  }
});
