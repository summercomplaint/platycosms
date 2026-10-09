import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/500.css';
import './style.css';
import { PLATYCOSMS, PlatycosmDef, byId } from './data/platycosms';
import { Stage, Mode } from './render/stage';
import { renderPanel } from './ui/panel';
import { content } from './content';
import { paragraphs } from './ui/markdown';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const stage = new Stage($('cv') as HTMLCanvasElement);
let current: PlatycosmDef = PLATYCOSMS[5];
let mode: Mode = 'outside';

$('intro').innerHTML = content.intro().map((s) => `<div>${paragraphs(s)}</div>`).join('');
/* ---------- tabs ---------- */
const tabs = $('tabs');
for (const P of PLATYCOSMS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.id = P.id;
  b.setAttribute('role', 'tab');
  b.innerHTML = `<span class="sym">${P.sym}</span><span class="nm">${P.name}</span>`;
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
let tabsShown = false; // the first scroll (page load) jumps, later ones glide
function syncUi(): void {
  document.querySelectorAll<HTMLElement>('#tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === current.id)));
  // on phones the bar scrolls sideways; keep the chosen platycosm in view (scrolls only the bar, never the page)
  const tabBar = $('tabs'), sel = tabBar.querySelector<HTMLElement>('[aria-selected="true"]');
  if (sel && tabBar.scrollWidth > tabBar.clientWidth) {
    const left = sel.offsetLeft - tabBar.offsetLeft, right = left + sel.offsetWidth;
    if (left < tabBar.scrollLeft || right > tabBar.scrollLeft + tabBar.clientWidth) tabBar.scrollTo({ left: left - 16, behavior: tabsShown ? 'smooth' : 'auto' });
  }
  tabsShown = true;
  $('mOut').setAttribute('aria-pressed', String(mode === 'outside'));
  $('mIn').setAttribute('aria-pressed', String(mode === 'inside'));
  $('hint').hidden = mode !== 'inside';
  renderPanel($('panel'), stage, mode);
  stage.applyOptions();
}
/** the view named in the hash; a bare #id (a link in the text) keeps the current view */
const viewOf = (view: string | undefined): Mode => (view === 'inside' ? 'inside' : view === 'outside' ? 'outside' : mode);
function fromHash(): void {
  const [id, view, extra] = location.hash.slice(1).split('/');
  go(id || 'c22', viewOf(view));
  // #c22/outside/anim1@0.5 starts gluing 1 paused at half way (used for slides and screenshots)
  const a = /^anim([0-9]+)@([0-9.]+)$/.exec(extra ?? '');
  if (a) { stage.anim.start(Number(a[1]) - 1); stage.anim.scrub(Number(a[2])); stage.applyOptions(); }
}
window.addEventListener('hashchange', () => {
  const [id, view] = location.hash.slice(1).split('/');
  const m = viewOf(view);
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

/* ---------- crab toggle ---------- */
const crabBox = $<HTMLInputElement>('tCrab');
if (location.search.includes('nocrab')) crabBox.checked = false;
stage.options.crab = crabBox.checked;
crabBox.addEventListener('change', () => { stage.options.crab = crabBox.checked; stage.applyOptions(); });

/* ---------- light / dark (dark, the space theme, is the default; ?light forces light) ---------- */
let light = location.search.includes('light');
try { if (localStorage.getItem('platy-theme') === 'light') light = true; } catch { /* ignore */ }
function applyTheme(): void {
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  const label = light ? 'Switch to dark mode' : 'Switch to light mode';
  $('bTheme').setAttribute('aria-label', label);
  $('bTheme').title = label;
  stage.setTheme(light);
}
$('bTheme').addEventListener('click', () => {
  light = !light;
  try { localStorage.setItem('platy-theme', light ? 'light' : 'dark'); } catch { /* ignore */ }
  applyTheme();
});
applyTheme();

/* ---------- save PNG ---------- */
/* the Save PNG button opens a small popover with the transparent-background choice */
const pop = $('pngPop'), bPng = $('bPng');
const setPop = (open: boolean) => { pop.hidden = !open; bPng.setAttribute('aria-expanded', String(open)); };
bPng.addEventListener('click', () => setPop(pop.hidden === true));
document.addEventListener('pointerdown', (e) => { if (!pop.hidden && !(e.target as HTMLElement).closest('.savewrap')) setPop(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { setPop(false); bPng.focus(); } });
/** e.g. didicosm-c22-outside.png, first-amphicosm-plus-a1-inside.png (the name and symbol on the page, not the internal id) */
const fileName = (P: PlatycosmDef, m: Mode) =>
  `${P.name.toLowerCase().replace(/\s+/g, '-')}-${P.sym.replace(/^\+/, 'plus-').replace(/^−/, 'minus-')}-${m}.png`;
$('bSave').addEventListener('click', async () => {
  setPop(false);
  const blob = await stage.snapshot($<HTMLInputElement>('tTransp').checked);
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName(current, mode);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // revoke late: a browser still asking where to save (Firefox) loses the name if the URL goes away first
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
});

fromHash();
