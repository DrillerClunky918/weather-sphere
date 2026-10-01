import { renderHome } from './pages/home';
import { renderDashboard } from './pages/dashboard';
import { renderData } from './utils/data';

// This map links the URL path to the function that renders the page
const routes: Record<string, () => void> = {
  '/': renderHome,
  '/dashboard': renderDashboard,
  '/data': renderData,
};

function handleRouting() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  // 1. Clear the current page content
  outlet.innerHTML = '';

  // 2. Get the current "hash" from the URL (e.g., #/dashboard)
  // If the hash is empty, default to '/' (Home)
  const hash = window.location.hash.replace('#', '') || '/';
  
  // 3. Find the right function to run
  const renderFn = routes[hash] || renderHome;
  
  // 4. Execute the function to show the page
  renderFn();
}

// Listen for when the user clicks a link (the hash changes)
window.addEventListener('hashchange', handleRouting);

// Also run once when the page first loads
window.addEventListener('load', handleRouting);

// Remove 'active' class from all links
document.querySelectorAll('.nav-links a').forEach(link => {
  link.classList.remove('active');
});

// Add 'active' class to the current link
const currentLink = document.querySelector(`.nav-links a[href="#${hash}"]`);
if (currentLink) {
  currentLink.classList.add('active');
}
