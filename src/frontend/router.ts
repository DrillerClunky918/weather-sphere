import { renderHome } from './pages/home';
import { renderDashboard } from './pages/dashboard';
import { renderData } from './utils/data';

const routes: Record<string, () => void> = {
  '/': renderHome,
  '/dashboard': renderDashboard,
  '/data': renderData,
};

export function handleRouting() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  // Reset outlet before mounting new view
  outlet.innerHTML = '';

  // Extract path from URL hash (defaults to root)
  const hash = window.location.hash.replace('#', '') || '/';
  
  // Resolve view component from route map
  const renderFn = routes[hash] || renderHome;
  
  // Mount the resolved view
  renderFn();

  // Sync navigation UI active state
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.remove('active');
  });

  const currentLink = document.querySelector(`.nav-links a[href="#${hash}"]`);
  if (currentLink) {
    currentLink.classList.add('active');
  }
}

// Global navigation event listeners
window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);