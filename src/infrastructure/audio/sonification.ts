export type ToneKind = 'output' | 'loss';
export type ToneRegister = 'grave' | 'normal' | 'agudo';
const registers = { grave: 0.5, normal: 1, agudo: 2 } as const;
export function toneFor(value: number, kind: ToneKind, register: ToneRegister = 'normal') {
  if (
    !Number.isFinite(value) ||
    !['output', 'loss'].includes(kind) ||
    !Object.hasOwn(registers, register)
  )
    return undefined;
  const unit =
    kind === 'output'
      ? Math.max(0, Math.min(1, value))
      : (Math.log10(Math.max(1e-4, Math.min(10, value))) + 4) / 5;
  return {
    frequency: (220 + 660 * unit) * registers[register],
    clamped: kind === 'output' ? value < 0 || value > 1 : value < 1e-4 || value > 10,
  };
}
/** Gesture-controlled, disposable sine tone. It never starts or resumes on a value update. */
export class Sonification {
  private context?: AudioContext;
  private oscillator?: OscillatorNode;
  private gain?: GainNode;
  private revision = 0;
  active = false;
  constructor(
    private factory: () => AudioContext = () => new AudioContext(),
    private visible = () => !document.hidden,
  ) {}
  async start(value: number, kind: ToneKind, volume: number, register: ToneRegister = 'normal') {
    this.stop();
    const tone = toneFor(value, kind, register);
    if (!tone || !this.visible() || !Number.isFinite(volume)) return false;
    const id = ++this.revision;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const context = this.factory();
      this.context = context;
      this.oscillator = context.createOscillator();
      this.gain = context.createGain();
      this.gain.gain.setValueAtTime(0, context.currentTime);
      this.oscillator.type = 'sine';
      this.oscillator.connect(this.gain);
      this.gain.connect(context.destination);
      await Promise.race([
        context.resume(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(Error('AUDIO_RESUME_TIMEOUT')), 2000);
        }),
      ]);
      if (id !== this.revision) return false;
      if (!this.visible()) {
        this.stop();
        return false;
      }
      this.oscillator!.start();
      this.active = true;
      this.update(value, kind, volume, register);
      return true;
    } catch {
      if (id === this.revision) this.stop();
      return false;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }
  update(value: number, kind: ToneKind, volume: number, register: ToneRegister = 'normal') {
    if (!this.active || !this.context || !this.gain || !this.oscillator) return;
    const tone = toneFor(value, kind, register);
    if (!tone || !Number.isFinite(volume) || !this.visible()) {
      this.stop();
      return;
    }
    this.oscillator.frequency.setTargetAtTime(tone.frequency, this.context.currentTime, 0.015);
    this.gain.gain.setTargetAtTime(
      Math.max(0, Math.min(0.2, volume)),
      this.context.currentTime,
      0.015,
    );
  }
  stop() {
    this.revision++;
    this.active = false;
    const context = this.context;
    try {
      if (context && this.gain) {
        this.gain.gain.cancelScheduledValues(context.currentTime);
        this.gain.gain.setValueAtTime(0, context.currentTime);
      }
      this.oscillator?.stop();
    } catch {
      /* An oscillator may still be waiting for the gesture's resume promise. */
    }
    if (context) void context.close().catch(() => {});
    this.context = undefined;
    this.oscillator = undefined;
    this.gain = undefined;
  }
}
