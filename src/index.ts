// src/index.ts
import { handleRouting } from './frontend/router'; 
import './style.css';

function initApp(): void {
  handleRouting();
}

initApp();