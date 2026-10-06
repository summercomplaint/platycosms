import type { PerspectiveCamera } from 'three';
import { Vector3 } from 'three';

/** Look-around (drag) and fly (WASD / arrows, Q/E for down/up) controls for the inside view. Z is up. */
export class FirstPerson {
  pos = new Vector3();
  yaw = 0;
  pitch = 0;
  speed = 1;
  enabled = false;
  private keys = new Set<string>();
  private dragging = false;
  private last = { x: 0, y: 0 };

  constructor(private camera: PerspectiveCamera, dom: HTMLElement) {
    dom.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      this.dragging = true;
      this.last = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', (e) => {
      if (!this.enabled || !this.dragging) return;
      const k = (this.camera.fov * Math.PI) / 180 / dom.clientHeight;
      this.yaw -= (e.clientX - this.last.x) * k;
      this.pitch = Math.max(-1.5, Math.min(1.5, this.pitch - (e.clientY - this.last.y) * k));
      this.last = { x: e.clientX, y: e.clientY };
    });
    const end = () => { this.dragging = false; };
    dom.addEventListener('pointerup', end);
    dom.addEventListener('pointercancel', end);
    dom.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      this.camera.fov = Math.max(30, Math.min(110, this.camera.fov + e.deltaY * 0.03));
      this.camera.updateProjectionMatrix();
    }, { passive: false });
    window.addEventListener('keydown', (e) => { if (this.enabled && !isTyping(e)) this.keys.add(e.code); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
  }

  /** Aim at a point from the current position. */
  lookAt(target: Vector3): void {
    const d = target.clone().sub(this.pos);
    this.yaw = Math.atan2(d.y, d.x);
    this.pitch = Math.atan2(d.z, Math.hypot(d.x, d.y));
  }

  forward(): Vector3 {
    return new Vector3(Math.cos(this.pitch) * Math.cos(this.yaw), Math.cos(this.pitch) * Math.sin(this.yaw), Math.sin(this.pitch));
  }

  /** true if the camera moved */
  update(dt: number): boolean {
    const f = this.forward(), up = new Vector3(0, 0, 1), right = f.clone().cross(up).normalize();
    const v = new Vector3();
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) v.add(f);
    if (k.has('KeyS') || k.has('ArrowDown')) v.sub(f);
    if (k.has('KeyD') || k.has('ArrowRight')) v.add(right);
    if (k.has('KeyA') || k.has('ArrowLeft')) v.sub(right);
    if (k.has('KeyE') || k.has('Space')) v.add(up);
    if (k.has('KeyQ') || k.has('KeyC')) v.sub(up);
    const moved = v.lengthSq() > 0;
    if (moved) this.pos.addScaledVector(v.normalize(), this.speed * dt * (k.has('ShiftLeft') || k.has('ShiftRight') ? 3 : 1));
    this.apply();
    return moved;
  }

  apply(): void {
    this.camera.up.set(0, 0, 1);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.pos.clone().add(this.forward()));
  }

  /** true while a movement key is held (the page uses this so arrow keys do not also switch tabs) */
  get active(): boolean { return this.enabled; }
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}
