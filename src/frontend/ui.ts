// src/frontend/ui.ts

let cachedCities: any[] = [];
let sortConfig: { column: string, direction: 'asc' | 'desc' | null } = { column: 'name', direction: null };

export async function loadAndRenderTable() {
  try {
    const response = await fetch('http://localhost:3000/api/weather');
    const rawData = await response.json();

    // Data Ingestion: Scale Methane from PPB to PPM (divide by 1000)
    // We do this here so that numerical sorting remains accurate.
    cachedCities = rawData.map((city: any) => {
      if (city.reports && city.reports[0] && typeof city.reports[0].methane === 'number') {
        city.reports[0].methane = parseFloat((city.reports[0].methane / 1000).toFixed(3));
      }
      return city;
    });

    renderSortedTable();
    setupSearch();
  } catch (error) {
    const tableBody = document.getElementById('tableBody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Offline</td></tr>';
  }
}

export function handleSort(column: string) {
  if (sortConfig.column !== column) {
    sortConfig.column = column;
    sortConfig.direction = 'asc';
  } else {
    if (sortConfig.direction === 'asc') sortConfig.direction = 'desc';
    else if (sortConfig.direction === 'desc') sortConfig.direction = null;
    else sortConfig.direction = 'asc';
  }
  renderSortedTable();
  updateSortUI();
}

function renderSortedTable() {
  let displayData = [...cachedCities];
  if (sortConfig.direction !== null) {
    displayData.sort((a, b) => {
      let valA = getVal(a, sortConfig.column);
      let valB = getVal(b, sortConfig.column);
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }
  const tableBody = document.getElementById('tableBody');
  if (tableBody) tableBody.innerHTML = displayData.map(row => generateRow(row)).join('');
}

function getVal(city: any, key: string) {
  if (key === 'name' || key === 'state') return city[key].toLowerCase();
  return city.reports[0]?.[key] || 0;
}

function generateRow(city: any): string {
  const report = city.reports[0] || {};
  let sources: any = {};
  try { sources = JSON.parse(report.sources || '{}'); } catch (e) { }

  const createTooltip = (metric: string, title: string) => {
    const entries = Object.entries(sources).map(([name, data]: [string, any]) => {
      const metricData = data[metric];
      if (!metricData) return '';
      
      let val = (typeof metricData === 'object' && metricData !== null) ? metricData.val : metricData;
      
      // Scaling source breakdown values to match the PPM consensus
      if (metric === 'methane' && typeof val === 'number') {
        val = (val / 1000).toFixed(3);
      }

      const isOutlier = metricData.isOutlier === true;
      return `<div class="source-row ${isOutlier ? 'outlier' : ''}">
                <span>${name}</span>
                <span class="source-val">${isOutlier ? `<span class="strikethrough">${val}</span>` : val}</span>
              </div>`;
    }).join('');
    return `<div class="tooltip-content"><div class="tooltip-title">${title}</div>${entries || 'No source data'}</div>`;
  };

  // Displaying raw number only (units are now in the <th>)
  const methaneDisplay = report.methane !== undefined ? report.methane : 'N/A';

  return `
    <tr>
      <td class="city-name">${city.name}</td>
      <td class="city-state">${city.state}</td>
      <td><span class="data-cell">${report.pm25 || 0}${createTooltip('pm25', 'PM 2.5 Breakdown')}</span></td>
      <td><span class="data-cell" style="color:#94a3b8">${report.pm10 || 0}${createTooltip('pm10', 'PM 10 Breakdown')}</span></td>
      <td><span class="data-cell" style="color:#818cf8">${report.ozone || 0}${createTooltip('ozone', 'Ozone Breakdown')}</span></td>
      <td><span class="data-cell" style="color:#10b981">${methaneDisplay}${createTooltip('methane', 'Methane (PPM) Breakdown')}</span></td>
    </tr>
  `;
}

export function setupSearch() {
  const input = document.getElementById('citySearch') as HTMLInputElement;
  input?.addEventListener('keyup', () => {
    const term = input.value.toLowerCase();
    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach(row => {
      (row as HTMLElement).style.display = row.textContent?.toLowerCase().includes(term) ? "" : "none";
    });
  });
}

function updateSortUI() {
  document.querySelectorAll('.sortable').forEach(el => el.classList.remove('sort-asc', 'sort-desc'));
  if (sortConfig.direction) {
    document.querySelector(`th[data-sort="${sortConfig.column}"]`)?.classList.add(`sort-${sortConfig.direction}`);
  }
}