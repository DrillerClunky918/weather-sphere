// src/ui.ts

export function updateDashboard(cities: any[]) {
  const tableBody = document.getElementById('tableBody');
  if (!tableBody) return;
  tableBody.innerHTML = cities.map(row => generateRow(row)).join('');
}

function generateRow(city: any): string {
  const report = city.reports[0];
  const pm25 = report?.pm25 || 0;
  const pm10 = report?.pm10 || 0;

  let sources: any = {};
  try { sources = JSON.parse(report?.sources || '{}'); } catch (e) { }

  const generateTooltip = (metric: 'pm25' | 'pm10') => {
    return Object.entries(sources).map(([name, data]: [string, any]) => {
      
      const metricData = data[metric];
      if (!metricData) return '';

      const val = (typeof metricData === 'object' && metricData !== null) 
        ? metricData.val 
        : metricData;

      if (val === null || val === undefined) return '';

      const isOutlier = metricData.isOutlier === true;

      // --- THE FIX: INLINE STYLES ---
      if (isOutlier) {
        return `
          <div class="source-row" style="color: #f87171; display: flex; justify-content: space-between;">
            <span>${name}</span>
            <span>
                <span style="text-decoration: line-through; color: #f87171;">${val}</span>
                <span style="font-size: 0.7em; margin-left: 4px; color: #f87171;">(Excluded)</span>
            </span>
          </div>`;
      } else {
        return `
          <div class="source-row">
            <span>${name}</span>
            <span class="source-val">${val}</span>
          </div>`;
      }
    }).join('');
  };

  return `
    <tr>
      <td class="city-name">${city.name}</td>
      <td class="city-state">${city.state}</td>
      
      <td>
          <span class="data-cell">
            ${pm25}
            <div class="tooltip-content">
              <div class="tooltip-title-pm25">PM 2.5 Sources</div>
              ${generateTooltip('pm25') || '<div class="no-data">No data</div>'}
            </div>
          </span>
      </td>

      <td>
          <span class="data-cell data-cell-dim">
            ${pm10}
            <div class="tooltip-content">
              <div class="tooltip-title-pm10">PM 10 Sources</div>
              ${generateTooltip('pm10') || '<div class="no-data">No data</div>'}
            </div>
          </span>
      </td>
    </tr>
  `;
}

export function setupSearch() {
  const searchInput = document.getElementById('citySearch');
  const tableBody = document.getElementById('tableBody');
  
  searchInput?.addEventListener('keyup', (e) => {
    const term = (e.target as HTMLInputElement).value.toLowerCase();
    const rows = tableBody?.getElementsByTagName('tr');
    if (rows) {
      for (let row of rows) {
        const text = row.textContent?.toLowerCase() || "";
        row.style.display = text.includes(term) ? "" : "none";
      }
    }
  });
}