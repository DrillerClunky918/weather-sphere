import { handleRouting } from './router';
import './style.css';

function initApp() {
  // 1. Initial route check on load
  handleRouting();

}

// Start the application
initApp();