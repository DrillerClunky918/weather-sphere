// src/frontend/router.ts
import { renderHome } from './pages/home';
import { renderDashboard } from './pages/dashboard';
import { loadAndRenderTable } from './pages/dataTable';
import { renderGlobalQuery } from './pages/globalQuery';
import { renderLocalAir } from './pages/localAir';

type RenderCallback = (container: HTMLElement) => void;

const routes: Record<string, RenderCallback> = {
  '/': renderHome,
  '/dashboard': renderDashboard,
  '/data': loadAndRenderTable,
  '/local': renderLocalAir, 
  '/query': renderGlobalQuery,
};

export function handleRouting(): void {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = '';

  const hash = window.location.hash.replace('#', '') || '/';
  const renderFn = routes[hash] || renderHome;
  
  renderFn(outlet);

  document.querySelectorAll('.nav-links a, .navbar a').forEach(link => {
    link.classList.remove('active');
  });

  const currentLink = document.querySelector(`a[href="#${hash}"]`);
  if (currentLink) {
    currentLink.classList.add('active');
  }
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);