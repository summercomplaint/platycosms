/** A small timeline for the symmetry animation: wait, move 0 -> 1, hold, repeat. */
export class Animator {
  /** which generator (0..2) is playing, or null */
  gen: number | null = null;
  /** progress 0..1 (before easing) */
  tau = 0;
  playing = false;
  private phase: 'start' | 'run' | 'end' = 'start';
  private wait = 0;
  readonly duration = 3.2;

  start(gen: number): void {
    this.gen = gen;
    this.tau = 0;
    this.playing = true;
    this.phase = 'start';
    this.wait = 0.5;
  }
  stop(): void {
    this.gen = null;
    this.tau = 0;
    this.playing = false;
  }
  pause(): void { this.playing = false; }
  resume(): void {
    if (this.gen === null) return;
    this.playing = true;
    if (this.tau >= 1) { this.tau = 0; this.phase = 'start'; this.wait = 0.4; } else this.phase = 'run';
  }
  scrub(t: number): void {
    this.tau = Math.max(0, Math.min(1, t));
    this.playing = false;
  }
  /** eased progress, what the renderer uses */
  get eased(): number { const t = this.tau; return t * t * (3 - 2 * t); }

  tick(dt: number): void {
    if (!this.playing || this.gen === null) return;
    if (this.phase === 'start') { this.wait -= dt; if (this.wait <= 0) this.phase = 'run'; return; }
    if (this.phase === 'run') {
      this.tau += dt / this.duration;
      if (this.tau >= 1) { this.tau = 1; this.phase = 'end'; this.wait = 1.1; }
      return;
    }
    this.wait -= dt;
    if (this.wait <= 0) { this.tau = 0; this.phase = 'start'; this.wait = 0.5; }
  }
}
