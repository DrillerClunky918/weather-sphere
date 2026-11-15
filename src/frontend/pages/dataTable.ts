import Chart from 'chart.js/auto';
import {
  CityStation,
  POLLUTANTS,
  POLLUTANT_LIST,
  getTrackedCities,
  saveTrackedCities,
  resetTrackedCities,
  getAqiGuidance,
  buildCityBarChart
} from '../config';

let cachedCities: any[] = [];
let sortConfig: { column: string; direction: 'asc' | 'desc' | null } = {
  column: 'name',
  direction: null
};
let tableMode: 'basic' | 'advanced' = 'basic';
let viewType: 'table' | 'chart' = 'table';
let selectedChartMetric: string = 'us_aqi';
let isEditingCities: boolean = false;
let cityBarChart: Chart | null = null;

export async function loadAndRenderTable() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  window.removeEventListener('themechange', handleThemeRedraw);
  window.addEventListener('themechange', handleThemeRedraw);

  outlet.innerHTML = `
    <div class="container">
      <p class="status-msg">Loading global station data...</p>
    </div>
  `;

  try {
    const stations = getTrackedCities();
    const fetchPromises = stations.map(async (city) => {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const json = await res.json();

      return {
        id: city.id,
        name: city.name,
        state: city.state,
        isUserCity: city.isUserCity || false,
        metrics: {
          us_aqi: json.current?.us_aqi ?? null,
          pm2_5: json.current?.pm2_5 ?? null,
          pm10: json.current?.pm10 ?? null,
          nitrogen_dioxide: json.current?.nitrogen_dioxide ?? null,
          ozone: json.current?.ozone ?? null,
          sulphur_dioxide: json.current?.sulphur_dioxide ?? null,
          carbon_monoxide: json.current?.carbon_monoxide ?? null
        }
      };
    });

    cachedCities = await Promise.all(fetchPromises);
    renderBaseLayout();
  } catch {
    outlet.innerHTML = `
      <div class="container">
        <p class="status-msg error">Unable to load station data. Check your connection and try again.</p>
      </div>
    `;
  }
}

function handleThemeRedraw() {
  if (viewType === 'chart' && document.getElementById('globalCityBarCanvas')) {
    renderBarChart();
  }
}

function renderBaseLayout() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  const currentSearch = (document.getElementById('citySearch') as HTMLInputElement)?.value || '';

  outlet.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>Global Air Quality Table</h1>
        <p class="subtitle">Compare live air quality readings across global stations and your local city.</p>
      </div>

      <div class="controls-bar controls-between">
        <div class="search-box-wrap">
          <input type="text" id="citySearch" class="search-input" placeholder="Filter cities..." value="${currentSearch}" />
        </div>

        <div class="control-row">
          <div class="segmented-toggle">
            <button id="viewTableBtn" class="segmented-btn ${viewType === 'table' ? 'active' : ''}">Table View</button>
            <button id="viewChartBtn" class="segmented-btn ${viewType === 'chart' ? 'active' : ''}">Bar Chart View</button>
          </div>

          ${
            viewType === 'table'
              ? `<div class="segmented-toggle">
                  <button id="tableBasicBtn" class="segmented-btn ${tableMode === 'basic' ? 'active' : ''}">Basic Mode</button>
                  <button id="tableAdvancedBtn" class="segmented-btn ${tableMode === 'advanced' ? 'active' : ''}">Advanced Mode</button>
                </div>`
              : `<select id="barMetricSelect" aria-label="Select metric to compare">
                  <option value="us_aqi" ${selectedChartMetric === 'us_aqi' ? 'selected' : ''}>General AQI</option>
                  ${POLLUTANT_LIST.map(
                    (p) => `<option value="${p.key}" ${selectedChartMetric === p.key ? 'selected' : ''}>${p.label} (${p.unit})</option>`
                  ).join('')}
                </select>`
          }

          <button id="editCitiesBtn" class="btn-ghost">
            ${isEditingCities ? 'Done Editing' : 'Edit Cities'}
          </button>
        </div>
      </div>

      ${isEditingCities ? renderCityEditorPanel() : ''}

      ${
        viewType === 'table' && tableMode === 'basic'
          ? `<div class="guidance-banner">
              <strong>General AQI:</strong> The Air Quality Index (0–500) summarizes overall air cleanliness into a single health score (0–50 Good, 51–100 Fair, 101–150 Sensitive Risk, 151+ Poor). Switch to <strong>Advanced Mode</strong> for individual pollutant concentrations or <strong>Bar Chart View</strong> to compare stations visually.
            </div>`
          : ''
      }

      ${
        viewType === 'table'
          ? `
            <h2 class="section-title">
              ${tableMode === 'basic' ? 'City Air Quality Overview' : 'Pollutant Concentrations'}
            </h2>
            <div class="table-container">
              <table class="${tableMode === 'advanced' ? 'table-auto' : ''}">
                <thead id="particulateHeader"></thead>
                <tbody id="particulateBody"></tbody>
              </table>
            </div>
          `
          : `
            <div class="timeline-panel">
              <div class="timeline-panel-header">
                <div>
                  <h2 class="section-title">
                    ${selectedChartMetric === 'us_aqi' ? 'General AQI Comparison' : `${POLLUTANTS[selectedChartMetric].label} Comparison`}
                  </h2>
                  <p class="subtitle">Cross-city snapshot (your detected/saved city is highlighted in secondary accent).</p>
                </div>
              </div>
              <div class="chart-wrapper chart-wrapper-lg">
                <canvas id="globalCityBarCanvas"></canvas>
              </div>
            </div>
          `
      }
    </div>
  `;

  setupControlsListeners();

  if (viewType === 'table') {
    renderTableRows();
    applySearchFilter();
  } else {
    renderBarChart();
  }
}

function renderCityEditorPanel(): string {
  const cities = getTrackedCities();
  return `
    <div class="aqi-card">
      <div class="timeline-panel-header">
        <div>
          <h3 class="card-kicker">Manage Tracked Stations (${cities.length})</h3>
          <p class="subtitle">Add any city worldwide or remove stations from the table and bar chart.</p>
        </div>
        <button id="resetCitiesBtn" class="btn-ghost" type="button">Reset Defaults</button>
      </div>

      <form id="addTableCityForm" class="inline-city-form full-width">
        <input type="text" id="newTableCityInput" placeholder="Add city (e.g., Seoul, Toronto, Berlin)..." required />
        <button type="submit" id="addTableCityBtn" class="btn-primary">Add City</button>
      </form>
      <div id="cityEditorMsg"></div>

      <div class="location-meta-row">
        ${cities
          .map(
            (c) => `
              <span class="status-pill">
                ${c.name}${c.isUserCity ? ' (You)' : ''}
                ${
                  cities.length > 1
                    ? `<button type="button" class="btn-ghost remove-city-btn" data-id="${c.id}" aria-label="Remove ${c.name}">×</button>`
                    : ''
                }
              </span>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}

function setupControlsListeners() {
  document.getElementById('viewTableBtn')?.addEventListener('click', () => {
    if (viewType !== 'table') {
      viewType = 'table';
      renderBaseLayout();
    }
  });

  document.getElementById('viewChartBtn')?.addEventListener('click', () => {
    if (viewType !== 'chart') {
      viewType = 'chart';
      renderBaseLayout();
    }
  });

  document.getElementById('tableBasicBtn')?.addEventListener('click', () => {
    if (tableMode !== 'basic') {
      tableMode = 'basic';
      renderBaseLayout();
    }
  });

  document.getElementById('tableAdvancedBtn')?.addEventListener('click', () => {
    if (tableMode !== 'advanced') {
      tableMode = 'advanced';
      renderBaseLayout();
    }
  });

  document.getElementById('barMetricSelect')?.addEventListener('change', (e) => {
    selectedChartMetric = (e.target as HTMLSelectElement).value;
    renderBaseLayout();
  });

  document.getElementById('editCitiesBtn')?.addEventListener('click', () => {
    isEditingCities = !isEditingCities;
    renderBaseLayout();
  });

  document.getElementById('resetCitiesBtn')?.addEventListener('click', async () => {
    resetTrackedCities();
    await loadAndRenderTable();
  });

  document.getElementById('addTableCityForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newTableCityInput') as HTMLInputElement;
    const btn = document.getElementById('addTableCityBtn') as HTMLButtonElement;
    const msg = document.getElementById('cityEditorMsg');
    const query = input?.value.trim();
    if (!query || !btn) return;

    btn.disabled = true;
    btn.innerText = 'Adding...';

    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
      );
      const geoData = await geoRes.json();
      if (!geoData.results?.length) {
        throw new Error(`Could not find "${query}".`);
      }

      const { latitude, longitude, name, country_code, country } = geoData.results[0];
      const currentList = getTrackedCities();
      if (currentList.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`${name} is already in your station list.`);
      }

      const newStation: CityStation = {
        id: `custom-${Date.now()}`,
        name,
        state: country_code || (country ? country.slice(0, 3).toUpperCase() : 'GLB'),
        lat: latitude,
        lon: longitude
      };

      saveTrackedCities([...currentList, newStation]);
      await loadAndRenderTable();
    } catch (err: any) {
      if (msg) {
        msg.innerHTML = `<p class="status-msg error">${err.message || 'Unable to add city.'}</p>`;
      }
      btn.disabled = false;
      btn.innerText = 'Add City';
    }
  });

  document.querySelectorAll('.remove-city-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id;
      const updated = getTrackedCities().filter((c) => String(c.id) !== String(id));
      if (updated.length > 0) {
        saveTrackedCities(updated);
        await loadAndRenderTable();
      }
    });
  });

  setupSearch();
}

function renderBarChart() {
  const canvas = document.getElementById('globalCityBarCanvas') as HTMLCanvasElement;
  if (!canvas) return;

  const term = ((document.getElementById('citySearch') as HTMLInputElement)?.value || '').toLowerCase();
  const filtered = cachedCities.filter((c) => c.name.toLowerCase().includes(term));

  const isAqi = selectedChartMetric === 'us_aqi';
  const meta = isAqi ? null : POLLUTANTS[selectedChartMetric];

  const items = filtered.map((c) => {
    const raw = c.metrics?.[selectedChartMetric];
    const val = raw !== null && raw !== undefined ? (isAqi ? Math.round(raw) : parseFloat(raw.toFixed(1))) : null;
    return {
      name: c.name,
      isUserCity: c.isUserCity,
      value: val
    };
  });

  cityBarChart = buildCityBarChart(
    canvas,
    cityBarChart,
    items,
    isAqi ? 'General AQI' : meta!.label,
    isAqi ? '' : meta!.unit
  );
}

function formatCellVal(val: number | undefined | null, decimals = 1): string {
  if (val === undefined || val === null || isNaN(val)) {
    return `<span class="cell-empty">--</span>`;
  }
  return val.toFixed(decimals);
}

function renderTableRows() {
  const pHeader = document.getElementById('particulateHeader');
  const pBody = document.getElementById('particulateBody');
  if (!pHeader || !pBody) return;

  const data = [...cachedCities];
  if (sortConfig.direction) {
    data.sort((a, b) => {
      const vA = getSortValue(a, sortConfig.column);
      const vB = getSortValue(b, sortConfig.column);
      if (vA === vB) return 0;
      if (vA === -Infinity) return 1;
      if (vB === -Infinity) return -1;
      const res = vA > vB ? 1 : -1;
      return sortConfig.direction === 'asc' ? res : -res;
    });
  }

  const getArrow = (col: string) => {
    if (sortConfig.column !== col || sortConfig.direction === null) {
      return `<span class="sort-ind">↕</span>`;
    }
    return sortConfig.direction === 'asc'
      ? `<span class="sort-ind active">↑</span>`
      : `<span class="sort-ind active">↓</span>`;
  };

  if (tableMode === 'basic') {
    pHeader.innerHTML = `
      <tr>
        <th class="sortable" data-col="name">Station ${getArrow('name')}</th>
        <th>Region</th>
        <th class="sortable" data-col="us_aqi">General AQI ${getArrow('us_aqi')}</th>
        <th>Simplified Interpretation</th>
      </tr>
    `;

    pBody.innerHTML = data
      .map((city) => {
        const aqi = city.metrics.us_aqi;
        const guidance = getAqiGuidance(aqi);
        return `
          <tr class="station-row" data-city="${city.name.toLowerCase()}">
            <td class="cell-bold">${city.name}${city.isUserCity ? ' <span class="status-pill text-accent">You</span>' : ''}</td>
            <td class="cell-muted">${city.state}</td>
            <td class="cell-bold">${aqi !== null ? Math.round(aqi) : '--'}</td>
            <td>
              <span class="status-pill status-${guidance.tier}">${guidance.label}</span>
              <span class="cell-muted"> ${guidance.summary}</span>
            </td>
          </tr>
        `;
      })
      .join('');
  } else {
    const pollutantHeaders = POLLUTANT_LIST.map(
      (p) => `<th class="sortable" data-col="${p.key}">${p.shortLabel} (${p.unit}) ${getArrow(p.key)}</th>`
    ).join('');

    pHeader.innerHTML = `
      <tr>
        <th class="sortable" data-col="name">Station ${getArrow('name')}</th>
        <th>Region</th>
        <th class="sortable" data-col="us_aqi">AQI ${getArrow('us_aqi')}</th>
        ${pollutantHeaders}
      </tr>
    `;

    pBody.innerHTML = data
      .map((city) => {
        const m = city.metrics;
        const pollutantCells = POLLUTANT_LIST.map(
          (p) => `<td>${formatCellVal(m[p.key], p.key === 'carbon_monoxide' ? 1 : 2)}</td>`
        ).join('');

        return `
          <tr class="station-row" data-city="${city.name.toLowerCase()}">
            <td class="cell-bold">${city.name}${city.isUserCity ? ' <span class="status-pill text-accent">You</span>' : ''}</td>
            <td class="cell-muted">${city.state}</td>
            <td class="cell-bold">${m.us_aqi !== null ? Math.round(m.us_aqi) : '--'}</td>
            ${pollutantCells}
          </tr>
        `;
      })
      .join('');
  }

  document.querySelectorAll('.sortable').forEach((th) => {
    (th as HTMLElement).onclick = () => {
      const col = (th as HTMLElement).dataset.col!;
      if (sortConfig.column !== col) {
        sortConfig.column = col;
        sortConfig.direction = 'asc';
      } else {
        sortConfig.direction =
          sortConfig.direction === 'asc' ? 'desc' : sortConfig.direction === 'desc' ? null : 'asc';
      }
      renderTableRows();
      applySearchFilter();
    };
  });
}

function getSortValue(city: any, key: string) {
  const val = key === 'name' || key === 'state' ? city[key] : city.metrics?.[key];
  if (val === undefined || val === null) return key === 'name' || key === 'state' ? '' : -Infinity;
  return typeof val === 'string' ? val.toLowerCase() : val;
}

function applySearchFilter() {
  const input = document.getElementById('citySearch') as HTMLInputElement;
  if (!input) return;
  const term = input.value.toLowerCase();
  document.querySelectorAll('.station-row').forEach((tr) => {
    const cityAttr = (tr as HTMLElement).dataset.city || '';
    (tr as HTMLElement).style.display = cityAttr.includes(term) ? '' : 'none';
  });
}

export function setupSearch() {
  const input = document.getElementById('citySearch') as HTMLInputElement;
  if (!input) return;
  input.oninput = () => {
    if (viewType === 'table') {
      applySearchFilter();
    } else {
      renderBarChart();
    }
  };
}
