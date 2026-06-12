let cachedCities: any[] = [];
let sortConfig: { column: string, direction: 'asc' | 'desc' | null } = { column: 'name', direction: null };
let currentActiveSource: string = 'all';

export async function loadAndRenderTable() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  currentActiveSource = localStorage.getItem('selectedSource') || 'all';

  try {
    const response = await fetch(`http://localhost:3000/api/weather?source=${currentActiveSource}`);
    if (!response.ok) throw new Error();
    cachedCities = await response.json();
    
    renderBaseLayout();
    renderTableRows();
    setupSearch();
  } catch (error) {
    outlet.innerHTML = `<div class="header"><h1>Offline</h1></div>`;
  }
}

function renderBaseLayout() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>Global Station Analytics Grid</h1>
      </div>

      <div class="controls-bar">
        <div class="control-group" style="flex: 1; max-width: 400px;">
          <input type="text" id="citySearch" class="search-input" placeholder="Filter monitoring stations across rows..." style="margin: 0;" />
        </div>
        
        <div class="control-group">
          <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">Audit Source</label>
          <select id="sourceDropdown">
            <option value="all">All Sources (Merged Average - IQR Outlier Trimmed)</option>
            <option value="Open-Meteo">Open-Meteo</option>
            <option value="WAQI">WAQI (World Air Quality Index)</option>
            <option value="OpenWeather">OpenWeather</option>
            <option value="WeatherAPI">WeatherAPI</option>
          </select>
        </div>
      </div>

      <div class="section-title-wrap" style="margin-bottom: 1rem;">
        <h2 style="font-size: 1.4rem; color: var(--accent); margin: 0;">Particulate Matter Mass Fractions</h2>
      </div>
      <div class="table-container">
        <table>
          <thead id="particulateHeader"></thead>
          <tbody id="particulateBody"></tbody>
        </table>
      </div>
    </div>
  `;

  const dropdown = document.getElementById('sourceDropdown') as HTMLSelectElement;
  if (dropdown) {
    dropdown.value = currentActiveSource;
    dropdown.addEventListener('change', () => {
      localStorage.setItem('selectedSource', dropdown.value);
      loadAndRenderTable();
    });
  }
}

function generateTooltipHtml(metricKey: string, sourcesJsonStr: string, finalVal: number | undefined | null): string {
  if (finalVal === undefined || finalVal === null || isNaN(finalVal)) {
    return `<span style="color: var(--border-muted);">--</span>`;
  }
  
  const formattedFinal = finalVal.toFixed(2);
  if (currentActiveSource !== 'all') return formattedFinal;
  if (!sourcesJsonStr) return formattedFinal;
  
  try {
    const allSources = JSON.parse(sourcesJsonStr);
    let lines = '';
    
    for (const [provider, metrics] of Object.entries(allSources)) {
      const metricObj = (metrics as any)[metricKey];
      if (!metricObj || metricObj.val === null) continue;

      if (metricObj.isOutlier) {
        lines += `<div class="crossed-out">${provider}: ${metricObj.val.toFixed(2)} µg/m³ (Outlier Ignored)</div>`;
      } else {
        lines += `<div>${provider}: ${metricObj.val.toFixed(2)} µg/m³</div>`;
      }
    }

    if (!lines) return formattedFinal;

    return `
      <div class="tt-cell">
        ${formattedFinal}
        <div class="tt-box">${lines}</div>
      </div>
    `;
  } catch (e) {
    return formattedFinal;
  }
}

function renderTableRows() {
  const pHeader = document.getElementById('particulateHeader');
  const pBody = document.getElementById('particulateBody');
  if (!pHeader || !pBody) return;

  let data = [...cachedCities];
  if (sortConfig.direction) {
    data.sort((a, b) => {
      const vA = getSortValue(a, sortConfig.column);
      const vB = getSortValue(b, sortConfig.column);
      if (vA === vB) return 0;
      const res = vA > vB ? 1 : -1;
      return sortConfig.direction === 'asc' ? res : -res;
    });
  }

  pHeader.innerHTML = `
    <tr style="color: var(--accent); text-transform: uppercase; font-size: 0.8rem; height: 45px;">
      <th class="sortable" data-col="name" style="padding: 1rem; cursor: pointer;">Station</th>
      <th style="padding: 1rem;">Region</th>
      <th class="sortable" data-col="pm25" style="padding: 1rem; cursor: pointer;">PM 2.5 (µg/m³)</th>
      <th class="sortable" data-col="pm10" style="padding: 1rem; cursor: pointer;">PM 10 (µg/m³)</th>
    </tr>
  `;

  pBody.innerHTML = data.map(city => {
    const r = city.reports?.[0] || { pm25: null, pm10: null, sources: null };
    return `
      <tr class="station-row" data-city="${city.name.toLowerCase()}">
        <td style="font-weight: 600; color: var(--text-main);">${city.name}</td>
        <td style="color: var(--text-muted);">${city.state}</td>
        <td>${generateTooltipHtml('pm25', r.sources, r.pm25)}</td>
        <td>${generateTooltipHtml('pm10', r.sources, r.pm10)}</td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.sortable').forEach(th => {
    (th as HTMLElement).onclick = () => {
      const col = (th as HTMLElement).dataset.col!;
      sortConfig.direction = (sortConfig.column === col && sortConfig.direction === 'asc') ? 'desc' : 'asc';
      sortConfig.column = col;
      renderTableRows();
    };
  });
}

function getSortValue(city: any, key: string) {
  const val = (key === 'name' || key === 'state') ? city[key] : city.reports?.[0]?.[key];
  if (val === undefined || val === null) return key === 'name' || key === 'state' ? '' : -Infinity;
  return typeof val === 'string' ? val.toLowerCase() : val;
}

export function setupSearch() {
  const input = document.getElementById('citySearch') as HTMLInputElement;
  if (!input) return;
  input.oninput = () => {
    const term = input.value.toLowerCase();
    document.querySelectorAll('.station-row').forEach(tr => {
      const cityAttr = (tr as HTMLElement).dataset.city || '';
      (tr as HTMLElement).style.display = cityAttr.includes(term) ? '' : 'none';
    });
  };
}