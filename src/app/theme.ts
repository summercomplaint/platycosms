/* Light / dark. Dark (the space theme) is the default; ?light forces light; the choice is remembered. */

let light = location.search.includes('light');
try { if (localStorage.getItem('platy-theme') === 'light') light = true; } catch { /* ignore */ }
const listeners = new Set<(light: boolean) => void>();

export const isLight = (): boolean => light;

/** call `f` now and on every change; returns an unsubscribe function */
export function onTheme(f: (light: boolean) => void): () => void {
  listeners.add(f);
  f(light);
  return () => listeners.delete(f);
}

/** wire the sun/moon button (fixed at the top right of every page) */
export function initTheme(button: HTMLElement): void {
  const apply = () => {
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    const label = light ? 'Switch to dark mode' : 'Switch to light mode';
    button.setAttribute('aria-label', label);
    button.title = label;
    listeners.forEach((f) => f(light));
  };
  button.addEventListener('click', () => {
    light = !light;
    try { localStorage.setItem('platy-theme', light ? 'light' : 'dark'); } catch { /* ignore */ }
    apply();
  });
  apply();
}
