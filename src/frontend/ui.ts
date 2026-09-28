let cachedCities: any[] = [];
let sortConfig: { column: string, direction: 'asc' | 'desc' | null } = { column: 'name', direction: null };

// Load the default view (latest report for each city)
export async function loadAndRenderTable() {
  try {
    const response = await fetch('http://localhost:3000/api/weather');
    const rawData = await response.json();

    cachedCities = rawData.map((city: any) => normalizeCityData(city));

    renderSortedTable();
    setupSearch();
  } catch (error) {
    handleFetchError();
  }
}

// Fetch historical reports from the general search endpoint
export async function filterTableByHistory(hours: number) {
  try {
    const fromDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const response = await fetch(`http://localhost:3000/api/reports/search?from=${fromDate}&limit=200`);
    const reports = await response.json();

    // Map reports into the city structure expected by the renderer
    cachedCities = reports.map((report: any) => {
      const city = { ...report.city, reports: [report] };
      return normalizeCityData(city);
    });

    renderSortedTable();
  } catch (error) {
    console.error(error);
  }
}

// Standardize metrics (e.g., Methane to PPM) across data sources
function normalizeCityData(city: any) {
  if (city.reports?.[0] && typeof city.reports[0].methane === 'number') {
    city.reports[0].methane = parseFloat((city.reports[0].methane / 1000).toFixed(3));
  }
  return city;
}

function handleFetchError() {
  const tableBody = document.getElementById('tableBody');
  if (tableBody) tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Offline</td></tr>';
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
  
  // Parse source breakdown JSON safely
  try { 
    sources = typeof report.sources === 'string' ? JSON.parse(report.sources) : (report.sources || {}); 
  } catch (e) { }

  const createTooltip = (metric: string, title: string) => {
    const entries = Object.entries(sources).map(([name, data]: [string, any]) => {
      const metricData = data[metric];
      
      // Ensure we target the .val property from the distribution object
      if (!metricData || metricData.val === undefined || metricData.val === null) return '';
      
      let val = metricData.val;
      if (metric === 'methane' && typeof val === 'number') {
        val = (val / 1000).toFixed(3);
      } else if (typeof val === 'number') {
        val = val.toFixed(1);
      }

      const isOutlier = metricData.isOutlier === true;
      return `
        <div class="source-row ${isOutlier ? 'outlier' : ''}">
          <span>${name}</span>
          <span class="source-val ${isOutlier ? 'strikethrough' : ''}">${val}</span>
        </div>`;
    }).join('');

    return `
      <div class="tooltip-content">
        <div class="tooltip-title">${title}</div>
        ${entries || '<div class="source-row"><span>No API Data</span></div>'}
      </div>`;
  };

  return `
    <tr>
      <td class="city-name">${city.name}</td>
      <td class="city-state">${city.state}</td>
      <td><span class="data-cell">${report.pm25 || 0}${createTooltip('pm25', 'PM 2.5 Breakdown')}</span></td>
      <td><span class="data-cell" style="color:#94a3b8">${report.pm10 || 0}${createTooltip('pm10', 'PM 10 Breakdown')}</span></td>
      <td><span class="data-cell" style="color:#818cf8">${report.ozone || 0}${createTooltip('ozone', 'Ozone Breakdown')}</span></td>
      <td><span class="data-cell" style="color:#10b981">${report.methane ?? 'N/A'}${createTooltip('methane', 'Methane (PPM) Breakdown')}</span></td>
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
    const targetHeader = document.querySelector(`th[data-sort="${sortConfig.column}"]`);
    targetHeader?.classList.add(`sort-${sortConfig.direction}`);
  }
}