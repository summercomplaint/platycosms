import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/500.css';
import './style.css';
import { startRouter } from './app/router';
import { initTheme, onTheme } from './app/theme';
import { setEntriesTheme } from './render/entries';
import { homePage } from './pages/home';
import { learnPage } from './pages/learn';
import { platycosmPage } from './pages/platycosm';

onTheme(setEntriesTheme);
initTheme(document.getElementById('bTheme')!);
startRouter(document.getElementById('app')!, { home: homePage, learn: learnPage, cosm: platycosmPage });
