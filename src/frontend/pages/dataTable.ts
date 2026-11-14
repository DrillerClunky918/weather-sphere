import {
  STATIC_CITIES,
  POLLUTANT_LIST,
  getAqiGuidance
} from '../config';

let cachedCities: any[] = [];
let sortConfig: { column: string; direction: 'asc' | 'desc' | null } = {
  column: 'name',
  direction: null
};
let tableMode: 'basic' | 'advanced' = 'basic';

export async function loadAndRenderTable() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container">
      <p class="status-msg">Loading global station data...</p>
    </div>
  `;

  try {
    const fetchPromises = STATIC_CITIES.map(async (city) => {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const json = await res.json();

      return {
        id: city.id,
        name: city.name,
        state: city.state,
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
    renderTableRows();
    setupSearch();
  } catch {
    outlet.innerHTML = `
      <div class="container">
        <p class="status-msg error">Unable to load station data. Check your connection and try again.</p>
      </div>
    `;
  }
}

function renderBaseLayout() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>Global Air Quality Table</h1>
        <p class="subtitle">Live air quality readings across major monitoring stations.</p>
      </div>

      <div class="controls-bar controls-between">
        <div class="search-box-wrap">
          <input type="text" id="citySearch" class="search-input" placeholder="Filter cities..." />
        </div>

        <div class="segmented-toggle">
          <button id="tableBasicBtn" class="segmented-btn ${tableMode === 'basic' ? 'active' : ''}">Basic Mode</button>
          <button id="tableAdvancedBtn" class="segmented-btn ${tableMode === 'advanced' ? 'active' : ''}">Advanced Mode</button>
        </div>
      </div>

      ${
        tableMode === 'basic'
          ? `<div class="guidance-banner">
              <strong>General AQI:</strong> The Air Quality Index (0–500) summarizes overall air cleanliness into a single health score (0–50 Good, 51–100 Fair, 101–150 Sensitive Risk, 151+ Poor). Switch to <strong>Advanced Mode</strong> for individual pollutant concentrations.
            </div>`
          : ''
      }

      <h2 class="section-title">
        ${tableMode === 'basic' ? 'City Air Quality Overview' : 'Pollutant Concentrations'}
      </h2>

      <div class="table-container">
        <table class="${tableMode === 'advanced' ? 'table-auto' : ''}">
          <thead id="particulateHeader"></thead>
          <tbody id="particulateBody"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('tableBasicBtn')?.addEventListener('click', () => {
    if (tableMode !== 'basic') {
      tableMode = 'basic';
      renderBaseLayout();
      renderTableRows();
      setupSearch();
    }
  });

  document.getElementById('tableAdvancedBtn')?.addEventListener('click', () => {
    if (tableMode !== 'advanced') {
      tableMode = 'advanced';
      renderBaseLayout();
      renderTableRows();
      setupSearch();
    }
  });
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
            <td class="cell-bold">${city.name}</td>
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
            <td class="cell-bold">${city.name}</td>
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
      setupSearch();
    };
  });
}

function getSortValue(city: any, key: string) {
  const val = key === 'name' || key === 'state' ? city[key] : city.metrics?.[key];
  if (val === undefined || val === null) return key === 'name' || key === 'state' ? '' : -Infinity;
  return typeof val === 'string' ? val.toLowerCase() : val;
}

export function setupSearch() {
  const input = document.getElementById('citySearch') as HTMLInputElement;
  if (!input) return;
  input.oninput = () => {
    const term = input.value.toLowerCase();
    document.querySelectorAll('.station-row').forEach((tr) => {
      const cityAttr = (tr as HTMLElement).dataset.city || '';
      (tr as HTMLElement).style.display = cityAttr.includes(term) ? '' : 'none';
    });
  };
}
