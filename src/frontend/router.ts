import { renderHome } from './pages/home';
import { renderDashboard } from './pages/dashboard';
import { loadAndRenderTable } from './pages/dataTable';
import { renderGlobalQuery } from './pages/globalQuery';
import { renderLocalAir } from './pages/localAir';

const routes: Record<string, () => void> = {
  '/': renderHome,
  '/dashboard': renderDashboard,
  '/data': loadAndRenderTable,
  '/local': renderLocalAir, 
  '/query': renderGlobalQuery,
};

export function handleRouting() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  // Safely wipe old DOM fragments before mounting the new view node
  outlet.innerHTML = '';

  const hash = window.location.hash.replace('#', '') || '/';
  const renderFn = routes[hash] || renderHome;
  
  renderFn();

  // Clear out active states across navigation lists before appending new selections
  document.querySelectorAll('.nav-links a, .navbar a').forEach(link => {
    link.classList.remove('active');
  });

  // Target matching location references to paint the active sliding underline
  const currentLink = document.querySelector(`a[href="#${hash}"]`);
  if (currentLink) {
    currentLink.classList.add('active');
  }
}

// Global browser context listener loops
window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);