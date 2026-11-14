import { STATIC_CITIES } from '../config';

let cachedCities: any[] = [];
let sortConfig: { column: string, direction: 'asc' | 'desc' | null } = { column: 'name', direction: null };
let tableMode: 'basic' | 'advanced' = 'basic';

function getAqiInterpretation(aqi: number | null | undefined) {
  if (aqi === null || aqi === undefined || isNaN(aqi)) {
    return { badge: 'Unavailable', color: 'var(--text-muted)', text: 'No live station data' };
  }
  if (aqi <= 50) {
    return { badge: 'Good', color: '#4ade80', text: 'Clean air; safe for all outdoor activity' };
  }
  if (aqi <= 100) {
    return { badge: 'Fair', color: '#fbbf24', text: 'Acceptable; sensitive groups should monitor exertion' };
  }
  if (aqi <= 150) {
    return { badge: 'Sensitive Risk', color: '#fb923c', text: 'Limit prolonged outdoor activity if sensitive' };
  }
  return { badge: 'Poor', color: '#f87171', text: 'Elevated pollution; reduce outdoor exposure' };
}

export async function loadAndRenderTable() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

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
        reports: [{
          us_aqi: json.current?.us_aqi ?? null,
          pm25: json.current?.pm2_5 ?? null,
          pm10: json.current?.pm10 ?? null,
          no2: json.current?.nitrogen_dioxide ?? null,
          o3: json.current?.ozone ?? null,
          so2: json.current?.sulphur_dioxide ?? null,
          co: json.current?.carbon_monoxide ?? null,
          sources: null
        }]
      };
    });

    cachedCities = await Promise.all(fetchPromises);

    renderBaseLayout();
    renderTableRows();
    setupSearch();
  } catch {
    outlet.innerHTML = `<div class="header"><h1>Offline - Telemetry Unreachable</h1></div>`;
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

      <div class="controls-bar" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
        <div class="control-group" style="flex: 1; min-width: 240px; max-width: 400px;">
          <input type="text" id="citySearch" class="search-input" placeholder="Search Cities across rows..." style="margin: 0;" />
        </div>

        <div style="display: flex; background: var(--bg-input); padding: 4px; border-radius: 8px; border: 1px solid var(--border-muted);">
          <button id="tableBasicBtn" style="background: ${tableMode === 'basic' ? 'var(--accent)' : 'transparent'}; color: ${tableMode === 'basic' ? 'var(--btn-text)' : 'var(--text-muted)'}; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
            Basic Mode
          </button>
          <button id="tableAdvancedBtn" style="background: ${tableMode === 'advanced' ? 'var(--accent)' : 'transparent'}; color: ${tableMode === 'advanced' ? 'var(--btn-text)' : 'var(--text-muted)'}; border: none; padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; margin-left: 4px;">
            Advanced Mode
          </button>
        </div>
      </div>

      ${tableMode === 'basic' ? `
        <div style="background: var(--bg-card); border: 1px solid var(--border-muted); border-left: 4px solid var(--accent); padding: 0.9rem 1.15rem; border-radius: 6px; margin-bottom: 1.25rem; font-size: 0.88rem; color: var(--text-muted); line-height: 1.45;">
          <strong style="color: var(--text-main);">General AQI Definition:</strong> The Air Quality Index (0–500) summarizes overall air cleanliness into a single health score (0–50 Good, 51–100 Fair, 101–150 Sensitive Risk, 151+ Poor). Switch to <strong>Advanced Mode</strong> for individual gas and particulate concentrations.
        </div>
      ` : ''}

      <div class="section-title-wrap" style="margin-bottom: 1rem;">
        <h2 style="font-size: 1.4rem; color: var(--accent); margin: 0;">
          ${tableMode === 'basic' ? 'Global City Air Quality Overview' : 'Multi-Pollutant Mass Concentrations'}
        </h2>
      </div>
      <div class="table-container" style="overflow-x: auto;">
        <table>
          <thead id="particulateHeader"></thead>
          <tbody id="particulateBody"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('tableBasicBtn')?.addEventListener('click', () => {
    if (tableMode === 'basic') return;
    tableMode = 'basic';
    renderBaseLayout();
    renderTableRows();
    setupSearch();
  });

  document.getElementById('tableAdvancedBtn')?.addEventListener('click', () => {
    if (tableMode === 'advanced') return;
    tableMode = 'advanced';
    renderBaseLayout();
    renderTableRows();
    setupSearch();
  });
}

function formatCellVal(val: number | undefined | null, decimals = 2): string {
  if (val === undefined || val === null || isNaN(val)) {
    return `<span style="color: var(--border-muted);">--</span>`;
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
      return `<span style="opacity: 0.3; margin-left: 0.4rem; font-family: monospace;">↕</span>`;
    }
    return sortConfig.direction === 'asc'
      ? `<span style="color: var(--accent); margin-left: 0.4rem; font-family: monospace;">↑</span>`
      : `<span style="color: var(--accent); margin-left: 0.4rem; font-family: monospace;">↓</span>`;
  };

  if (tableMode === 'basic') {
    pHeader.innerHTML = `
      <tr style="color: var(--accent); text-transform: uppercase; font-size: 0.8rem; height: 45px;">
        <th class="sortable" data-col="name" style="padding: 1rem; cursor: pointer; user-select: none;">Station ${getArrow('name')}</th>
        <th style="padding: 1rem; user-select: none;">Region</th>
        <th class="sortable" data-col="us_aqi" style="padding: 1rem; cursor: pointer; user-select: none;">General AQI ${getArrow('us_aqi')}</th>
        <th style="padding: 1rem; user-select: none;">Plain-Language Interpretation</th>
      </tr>
    `;

    pBody.innerHTML = data.map(city => {
      const r = city.reports?.[0] || {};
      const interp = getAqiInterpretation(r.us_aqi);
      return `
        <tr class="station-row" data-city="${city.name.toLowerCase()}">
          <td style="font-weight: 600; color: var(--text-main);">${city.name}</td>
          <td style="color: var(--text-muted);">${city.state}</td>
          <td style="font-weight: 700; color: var(--text-main);">${r.us_aqi !== null ? Math.round(r.us_aqi) : '--'}</td>
          <td>
            <span style="font-weight: 700; color: ${interp.color}; text-transform: uppercase; font-size: 0.78rem; margin-right: 0.5rem;">
              ${interp.badge}
            </span>
            <span style="color: var(--text-muted); font-size: 0.88rem;">${interp.text}</span>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    pHeader.innerHTML = `
      <tr style="color: var(--accent); text-transform: uppercase; font-size: 0.8rem; height: 45px;">
        <th class="sortable" data-col="name" style="padding: 1rem; cursor: pointer; user-select: none;">Station ${getArrow('name')}</th>
        <th style="padding: 1rem; user-select: none;">Region</th>
        <th class="sortable" data-col="us_aqi" style="padding: 1rem; cursor: pointer; user-select: none;">AQI ${getArrow('us_aqi')}</th>
        <th class="sortable" data-col="pm25" style="padding: 1rem; cursor: pointer; user-select: none;">PM 2.5 (µg/m³) ${getArrow('pm25')}</th>
        <th class="sortable" data-col="pm10" style="padding: 1rem; cursor: pointer; user-select: none;">PM 10 (µg/m³) ${getArrow('pm10')}</th>
        <th class="sortable" data-col="no2" style="padding: 1rem; cursor: pointer; user-select: none;">NO₂ (µg/m³) ${getArrow('no2')}</th>
        <th class="sortable" data-col="o3" style="padding: 1rem; cursor: pointer; user-select: none;">O₃ (µg/m³) ${getArrow('o3')}</th>
        <th class="sortable" data-col="so2" style="padding: 1rem; cursor: pointer; user-select: none;">SO₂ (µg/m³) ${getArrow('so2')}</th>
        <th class="sortable" data-col="co" style="padding: 1rem; cursor: pointer; user-select: none;">CO (µg/m³) ${getArrow('co')}</th>
      </tr>
    `;

    pBody.innerHTML = data.map(city => {
      const r = city.reports?.[0] || {};
      return `
        <tr class="station-row" data-city="${city.name.toLowerCase()}">
          <td style="font-weight: 600; color: var(--text-main);">${city.name}</td>
          <td style="color: var(--text-muted);">${city.state}</td>
          <td style="font-weight: 700;">${r.us_aqi !== null ? Math.round(r.us_aqi) : '--'}</td>
          <td>${formatCellVal(r.pm25)}</td>
          <td>${formatCellVal(r.pm10)}</td>
          <td>${formatCellVal(r.no2)}</td>
          <td>${formatCellVal(r.o3)}</td>
          <td>${formatCellVal(r.so2)}</td>
          <td>${formatCellVal(r.co, 1)}</td>
        </tr>
      `;
    }).join('');
  }

  document.querySelectorAll('.sortable').forEach(th => {
    (th as HTMLElement).onclick = () => {
      const col = (th as HTMLElement).dataset.col!;

      if (sortConfig.column !== col) {
        sortConfig.column = col;
        sortConfig.direction = 'asc';
      } else {
        if (sortConfig.direction === 'asc') {
          sortConfig.direction = 'desc';
        } else if (sortConfig.direction === 'desc') {
          sortConfig.direction = null;
        } else {
          sortConfig.direction = 'asc';
        }
      }

      renderTableRows();
      setupSearch();
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
