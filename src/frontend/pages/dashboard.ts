import Chart from 'chart.js/auto';
import {
  STATIC_CITIES,
  POLLUTANTS,
  POLLUTANT_LIST,
  renderBasicAqiCards,
  buildLineChart,
  ChartSeriesInput
} from '../config';

let particulatesChart: Chart | null = null;
let cachedDashboardPayload: any = null;
let dashboardMode: 'basic' | 'advanced' = 'basic';
let dashboardHorizon: 'historical' | 'forecast' = 'historical';
let selectedMetrics: Set<string> = new Set(['pm2_5', 'pm10']);

export function renderDashboard() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>Station Air Analytics</h1>
        <p class="subtitle">Compare historical air quality records and upcoming forecasts across global stations.</p>
      </div>

      <div class="controls-bar controls-between">
        <div class="control-row">
          <div>
            <label for="cityDropdown" class="field-label">Select Station</label>
            <select id="cityDropdown">
              <option value="">Loading...</option>
            </select>
          </div>
          <button id="updateChartBtn" class="btn-primary">Refresh</button>
        </div>

        <div class="segmented-toggle">
          <button id="dashBasicBtn" class="segmented-btn ${dashboardMode === 'basic' ? 'active' : ''}">Basic Mode</button>
          <button id="dashAdvBtn" class="segmented-btn ${dashboardMode === 'advanced' ? 'active' : ''}">Advanced Mode</button>
        </div>
      </div>

      <div id="dashboardDynamicContent"></div>
    </div>
  `;

  populateCities();

  document.getElementById('updateChartBtn')?.addEventListener('click', fetchAndRenderDashboard);
  document.getElementById('cityDropdown')?.addEventListener('change', fetchAndRenderDashboard);

  document.getElementById('dashBasicBtn')?.addEventListener('click', () => {
    if (dashboardMode === 'basic') return;
    dashboardMode = 'basic';
    updateModeButtons();
    renderDashboardBody();
  });

  document.getElementById('dashAdvBtn')?.addEventListener('click', () => {
    if (dashboardMode === 'advanced') return;
    dashboardMode = 'advanced';
    updateModeButtons();
    renderDashboardBody();
  });

  window.removeEventListener('themechange', handleThemeRedraw);
  window.addEventListener('themechange', handleThemeRedraw);
}

function handleThemeRedraw() {
  if (document.getElementById('particulatesChartCanvas')) {
    buildDashboardChart();
  }
}

function updateModeButtons() {
  document.getElementById('dashBasicBtn')?.classList.toggle('active', dashboardMode === 'basic');
  document.getElementById('dashAdvBtn')?.classList.toggle('active', dashboardMode === 'advanced');
}

function populateCities() {
  const dropdown = document.getElementById('cityDropdown') as HTMLSelectElement;
  if (!dropdown) return;

  dropdown.innerHTML = STATIC_CITIES.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');

  const lastId = localStorage.getItem('selectedCityId');
  if (lastId && STATIC_CITIES.some((c) => String(c.id) === lastId)) {
    dropdown.value = lastId;
  }

  if (dropdown.value) {
    fetchAndRenderDashboard();
  }
}

async function fetchAndRenderDashboard() {
  const dropdown = document.getElementById('cityDropdown') as HTMLSelectElement;
  const contentContainer = document.getElementById('dashboardDynamicContent');
  if (!dropdown || !contentContainer) return;

  const cityId = dropdown.value;
  if (!cityId) return;

  localStorage.setItem('selectedCityId', cityId);
  const targetCity = STATIC_CITIES.find((c) => String(c.id) === String(cityId));
  if (!targetCity) return;

  contentContainer.innerHTML = `<div class="aqi-card"><p class="status-msg">Loading air quality data for ${targetCity.name}...</p></div>`;

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${targetCity.lat}&longitude=${targetCity.lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&hourly=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&past_days=5&forecast_days=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Unable to fetch station data.');
    const json = await res.json();

    cachedDashboardPayload = {
      city: targetCity,
      current: json.current || {},
      hourly: json.hourly || {}
    };

    renderDashboardBody();
  } catch (err: any) {
    contentContainer.innerHTML = `<div class="aqi-card"><p class="status-msg error">${err.message || 'Failed to load station trends.'}</p></div>`;
  }
}

function renderDashboardBody() {
  const contentContainer = document.getElementById('dashboardDynamicContent');
  if (!contentContainer || !cachedDashboardPayload) return;

  const { city, current } = cachedDashboardPayload;
  const basicOverviewHtml =
    dashboardMode === 'basic'
      ? renderBasicAqiCards(current.us_aqi, `Current General AQI — ${city.name}`)
      : '';

  const pollutantCheckboxesHtml =
    dashboardMode === 'advanced'
      ? `<div class="checkbox-group">
          ${POLLUTANT_LIST.map(
            (meta) => `
              <label class="checkbox-label">
                <input type="checkbox" class="particulate-check" value="${meta.key}" ${selectedMetrics.has(meta.key) ? 'checked' : ''}>
                ${meta.shortLabel}
              </label>
            `
          ).join('')}
        </div>`
      : '';

  contentContainer.innerHTML = `
    ${basicOverviewHtml}

    <div class="timeline-panel">
      <div class="timeline-panel-header">
        <div>
          <h2 class="section-title">
            ${dashboardMode === 'basic' ? `General AQI Trend — ${city.name}` : `Pollutant Concentrations — ${city.name}`}
          </h2>
          <p class="subtitle">
            ${dashboardMode === 'basic'
              ? 'Switch between past observations and upcoming air quality forecasts.'
              : 'Select gases and particulates below to compare concentration trends.'}
          </p>
        </div>

        <div class="segmented-toggle">
          <button id="dashHistBtn" class="segmented-btn ${dashboardHorizon === 'historical' ? 'active' : ''}">Historical (Past 5d)</button>
          <button id="dashForeBtn" class="segmented-btn ${dashboardHorizon === 'forecast' ? 'active' : ''}">Forecast (Next 5d)</button>
        </div>
      </div>

      ${pollutantCheckboxesHtml}

      <div class="chart-wrapper">
        <canvas id="particulatesChartCanvas"></canvas>
      </div>
    </div>
  `;

  document.getElementById('dashHistBtn')?.addEventListener('click', () => {
    if (dashboardHorizon === 'historical') return;
    dashboardHorizon = 'historical';
    renderDashboardBody();
  });

  document.getElementById('dashForeBtn')?.addEventListener('click', () => {
    if (dashboardHorizon === 'forecast') return;
    dashboardHorizon = 'forecast';
    renderDashboardBody();
  });

  document.querySelectorAll('.particulate-check').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.checked) {
        selectedMetrics.add(input.value);
      } else if (selectedMetrics.size > 1) {
        selectedMetrics.delete(input.value);
      } else {
        input.checked = true;
        return;
      }
      buildDashboardChart();
    });
  });

  buildDashboardChart();
}

function buildDashboardChart() {
  const pCanvas = document.getElementById('particulatesChartCanvas') as HTMLCanvasElement;
  if (!pCanvas || !cachedDashboardPayload?.hourly?.time) return;

  const hourly = cachedDashboardPayload.hourly;
  const series: ChartSeriesInput[] =
    dashboardMode === 'basic'
      ? [{ label: 'General AQI', data: hourly.us_aqi || [], cssVar: '--accent' }]
      : Array.from(selectedMetrics).map((key) => {
          const meta = POLLUTANTS[key];
          return {
            label: `${meta.shortLabel} (${meta.unit})`,
            data: hourly[key] || [],
            cssVar: meta.cssVar,
            yAxisID: meta.yAxisID
          };
        });

  particulatesChart = buildLineChart(
    pCanvas,
    particulatesChart,
    hourly.time,
    dashboardHorizon,
    series,
    dashboardMode === 'basic' ? 'General AQI' : 'Concentration (µg/m³)'
  );
}
