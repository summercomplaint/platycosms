/** A small timeline for the gluing animation: a short wait, then move 0 -> 1 and stop there. */
export class Animator {
  /** which face pairing is playing, or null */
  gen: number | null = null;
  /** progress 0..1 (before easing) */
  tau = 0;
  playing = false;
  private wait = 0;
  readonly duration = 2.6;

  start(gen: number): void {
    this.gen = gen;
    this.tau = 0;
    this.playing = true;
    this.wait = 0.3;
  }
  stop(): void {
    this.gen = null;
    this.tau = 0;
    this.playing = false;
  }
  pause(): void { this.playing = false; }
  /** carry on; from the end, play again from the start */
  resume(): void {
    if (this.gen === null) return;
    if (this.tau >= 1) { this.start(this.gen); return; }
    this.playing = true;
    this.wait = 0;
  }
  scrub(t: number): void {
    this.tau = Math.max(0, Math.min(1, t));
    this.playing = false;
  }
  /** eased progress, what the renderer uses */
  get eased(): number { const t = this.tau; return t * t * (3 - 2 * t); }

  tick(dt: number): void {
    if (!this.playing || this.gen === null) return;
    if (this.wait > 0) { this.wait -= dt; return; }
    this.tau += dt / this.duration;
    if (this.tau >= 1) { this.tau = 1; this.playing = false; }
  }
}
