// src/index.ts
import { updateDashboard, setupSearch } from './ui';

// 1. API URL (Change when backend port is different)
const API_URL = 'http://localhost:3000/api/weather'; 

async function init() {
  try {
    // 2. Fetch data from server
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Failed to fetch data');
    
    const data = await response.json();

    // 3. Table rows
    updateDashboard(data);

    // 4. Activate the search bar
    setupSearch();

  } catch (error) {
    console.error(error);
    const tableBody = document.getElementById('tableBody');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; color:#f87171; padding: 20px;">
            Error loading data. Is the server running?
          </td>
        </tr>`;
    }
  }
}

// Start the app
init();