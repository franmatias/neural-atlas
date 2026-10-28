export type ToneKind = 'output' | 'loss';
export function toneFor(value: number, kind: ToneKind) {
  if (!Number.isFinite(value) || !['output', 'loss'].includes(kind)) return undefined;
  const unit =
    kind === 'output'
      ? Math.max(0, Math.min(1, value))
      : (Math.log10(Math.max(1e-4, Math.min(10, value))) + 4) / 5;
  return {
    frequency: 220 + 660 * unit,
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
  async start(value: number, kind: ToneKind, volume: number) {
    this.stop();
    const tone = toneFor(value, kind);
    if (!tone || !this.visible() || !Number.isFinite(volume)) return false;
    const id = ++this.revision;
    try {
      const context = this.factory();
      this.context = context;
      this.oscillator = context.createOscillator();
      this.gain = context.createGain();
      this.gain.gain.setValueAtTime(0, context.currentTime);
      this.oscillator.type = 'sine';
      this.oscillator.connect(this.gain);
      this.gain.connect(context.destination);
      await context.resume();
      if (id !== this.revision) return false;
      if (!this.visible()) {
        this.stop();
        return false;
      }
      this.oscillator!.start();
      this.active = true;
      this.update(value, kind, volume);
      return true;
    } catch {
      if (id === this.revision) this.stop();
      return false;
    }
  }
  update(value: number, kind: ToneKind, volume: number) {
    if (!this.active || !this.context || !this.gain || !this.oscillator) return;
    const tone = toneFor(value, kind);
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
