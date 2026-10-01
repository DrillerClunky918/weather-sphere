let cachedCities: any[] = [];
let sortConfig: { column: string, direction: 'asc' | 'desc' | null } = { column: 'name', direction: null };

export async function loadAndRenderTable() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  try {
    const response = await fetch('http://localhost:3000/api/weather');
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
        <h1>Air Quality Data</h1>
      </div>

      <div class="info-grid">
        <div class="info-card"><h3>PM 2.5</h3><p>Threshold: 12</p></div>
        <div class="info-card"><h3>PM 10</h3><p>Threshold: 50</p></div>
        <div class="info-card"><h3>Ozone</h3><p>Threshold: 100</p></div>
        <div class="info-card"><h3>Methane</h3><p>Avg: 1250</p></div>
      </div>

      <input type="text" id="citySearch" class="search-input" placeholder="Search cities..." />

      <div class="table-container">
        <table>
          <thead id="tableHeader"></thead>
          <tbody id="tableBody"></tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTableRows() {
  const header = document.getElementById('tableHeader');
  const body = document.getElementById('tableBody');
  if (!header || !body) return;

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

  header.innerHTML = `
    <tr>
      <th class="sortable ${getSortClass('name')}" data-col="name">City <span class="sort-arrow"></span></th>
      <th class="sortable ${getSortClass('state')}" data-col="state">State <span class="sort-arrow"></span></th>
      <th class="sortable ${getSortClass('pm25')}" data-col="pm25">PM 2.5 <span class="sort-arrow"></span></th>
      <th class="sortable ${getSortClass('pm10')}" data-col="pm10">PM 10 <span class="sort-arrow"></span></th>
      <th class="sortable ${getSortClass('ozone')}" data-col="ozone">Ozone <span class="sort-arrow"></span></th>
      <th class="sortable ${getSortClass('methane')}" data-col="methane">Methane <span class="sort-arrow"></span></th>
    </tr>
  `;

  body.innerHTML = data.map(city => {
    const r = city.reports?.[0] || {};
    const sources = r.sources ? JSON.parse(r.sources) : {};

    const wrap = (
      val: any,
      label: string,
      key: 'pm25' | 'pm10' | 'ozone' | 'methane',
      threshold: string
    ) => {
      const breakdownHTML = Object.entries(sources).map(([provider, data]: any) => {
        const entry = data[key];
        if (!entry || entry.val === null) return '';

        const cls = entry.isOutlier ? 'outlier' : '';
        return `<div class="${cls}">${provider}: ${entry.val}</div>`;
      }).join('');

      return `
        <td class="data-cell">
          ${val}
          <div class="tooltip-content">
            <div class="tooltip-title">${label} Info</div>
            <div class="tooltip-breakdown">
              ${breakdownHTML}
            </div>
          </div>
        </td>
      `;
    };

    return `
      <tr>
        <td>${city.name}</td>
        <td>${city.state}</td>
        ${wrap((r.pm25 || 0).toFixed(1), 'PM 2.5', 'pm25', '12')}
        ${wrap((r.pm10 || 0).toFixed(1), 'PM 10', 'pm10', '50')}
        ${wrap((r.ozone || 0).toFixed(1), 'Ozone', 'ozone', '100')}
        ${wrap(r.methane ? Math.round(r.methane).toLocaleString() : 'N/A', 'methane', 'methane', '1250')}
      </tr>
    `;
  }).join('');

  header.querySelectorAll('.sortable').forEach(th => {
    (th as HTMLElement).onclick = () => {
      const col = (th as HTMLElement).dataset.col!;
      sortConfig.direction = (sortConfig.column === col && sortConfig.direction === 'asc') ? 'desc' : 'asc';
      sortConfig.column = col;
      renderTableRows();
    };
  });
}

function getSortClass(col: string) {
  if (sortConfig.column !== col || !sortConfig.direction) return '';
  return sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc';
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
    document.querySelectorAll('#tableBody tr').forEach(tr => {
      (tr as HTMLElement).style.display = tr.textContent?.toLowerCase().includes(term) ? '' : 'none';
    });
  };
}