// src/index.ts
import { handleRouting } from './frontend/router';
import './style.css';

const THEME_KEY = 'weathersphere-theme';

function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);

  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML = theme === 'dark' ? '&#9728;&#xFE0E;' : '&#9790;&#xFE0E;';
  }

  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

function initTheme(): void {
  const saved = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
  const initial: 'light' | 'dark' =
    saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  applyTheme(initial);

  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
}

function initApp(): void {
  initTheme();
  handleRouting();
}

initApp();
