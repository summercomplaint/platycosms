import './style.css';
import { PLATYCOSMS, PlatycosmDef, byId } from './data/platycosms';
import { factsFor } from './data/facts';
import { Stage, Mode } from './render/stage';
import { renderPanel } from './ui/panel';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const stage = new Stage($('cv') as HTMLCanvasElement);
let current: PlatycosmDef = PLATYCOSMS[5];
let mode: Mode = 'outside';

/* ---------- tabs ---------- */
const tabs = $('tabs');
for (const P of PLATYCOSMS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.id = P.id;
  b.setAttribute('role', 'tab');
  b.title = factsFor(P.id).mappingTorus.is ? 'Mapping torus' : 'Not a mapping torus';
  b.innerHTML = `<span class="sym">${P.sym}</span><span class="nm">${P.name}</span>${factsFor(P.id).mappingTorus.is ? '<span class="mt"></span>' : ''}`;
  b.addEventListener('click', () => go(P.id, mode));
  tabs.appendChild(b);
}

/* ---------- navigation (hash: #c22 or #c22/inside) ---------- */
function go(id: string, m: Mode): void {
  const P = byId(id) ?? PLATYCOSMS[5];
  current = P;
  mode = m;
  stage.show(P);
  stage.setMode(m);
  syncUi();
  try { history.replaceState(null, '', '#' + P.id + (m === 'inside' ? '/inside' : '')); } catch { /* ignore */ }
}
let lastMode: Mode | null = null;
function syncUi(): void {
  if (mode !== lastMode) {
    // arrowheads are for reading the gluing; from inside they mostly get in the way
    $<HTMLInputElement>('tArrows').checked = mode === 'outside';
    stage.options.arrows = mode === 'outside';
    lastMode = mode;
  }
  document.querySelectorAll<HTMLElement>('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === current.id)));
  $('mOut').setAttribute('aria-pressed', String(mode === 'outside'));
  $('mIn').setAttribute('aria-pressed', String(mode === 'inside'));
    $('lFaces').hidden = mode !== 'outside';
  $('lSpin').hidden = mode !== 'outside';
  $('lEdges').hidden = mode !== 'inside';
  $('hint').hidden = mode !== 'inside';
  renderPanel($('panel'), stage, mode);
  stage.applyOptions();
}
function fromHash(): void {
  const [id, view, extra] = location.hash.slice(1).split('/');
  go(id || 'c22', view === 'inside' ? 'inside' : 'outside');
  // #c22/outside/anim1@0.5 starts symmetry 1 paused at half way (used for slides and screenshots)
  const a = /^anim([123])@([0-9.]+)$/.exec(extra ?? '');
  if (a) { stage.anim.start(Number(a[1]) - 1); stage.anim.scrub(Number(a[2])); stage.applyOptions(); }
}
window.addEventListener('hashchange', () => {
  const [id, view] = location.hash.slice(1).split('/');
  const m: Mode = view === 'inside' ? 'inside' : 'outside';
  if (id !== current.id || m !== mode) fromHash();
});

$('mOut').addEventListener('click', () => go(current.id, 'outside'));
$('mIn').addEventListener('click', () => go(current.id, 'inside'));
window.addEventListener('keydown', (e) => {
  if (mode !== 'outside' || (e.target as HTMLElement).closest('input')) return;
  const i = PLATYCOSMS.indexOf(current);
  if (e.key === 'ArrowRight') go(PLATYCOSMS[(i + 1) % PLATYCOSMS.length].id, mode);
  if (e.key === 'ArrowLeft') go(PLATYCOSMS[(i + PLATYCOSMS.length - 1) % PLATYCOSMS.length].id, mode);
});

/* ---------- toggles ---------- */
const bindToggle = (id: string, key: keyof typeof stage.options) => {
  const el = $<HTMLInputElement>(id);
  stage.options[key] = el.checked;
  el.addEventListener('change', () => { stage.options[key] = el.checked; stage.applyOptions(); });
};
bindToggle('tArrows', 'arrows');
bindToggle('tFaces', 'faces');
if (location.search.includes('nocrab')) $<HTMLInputElement>('tCrab').checked = false;
bindToggle('tCrab', 'crab');
bindToggle('tEdges', 'edges');
bindToggle('tSpin', 'spin');

/* ---------- theme ---------- */
const themes = ['auto', 'light', 'dark'] as const;
let theme: (typeof themes)[number] = 'auto';
try { const t = localStorage.getItem('platy-theme'); if (t === 'light' || t === 'dark') theme = t; } catch { /* ignore */ }
function applyTheme(): void {
  if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  $('bTheme').textContent = 'Theme: ' + theme;
  stage.refreshTheme();
}
$('bTheme').addEventListener('click', () => {
  theme = themes[(themes.indexOf(theme) + 1) % 3];
  try { localStorage.setItem('platy-theme', theme); } catch { /* ignore */ }
  applyTheme();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => stage.refreshTheme());
applyTheme();

/* ---------- save PNG ---------- */
$('bPng').addEventListener('click', async () => {
  const blob = await stage.snapshot($<HTMLInputElement>('tTransp').checked);
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `platycosm-${current.id}-${mode}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});

fromHash();
