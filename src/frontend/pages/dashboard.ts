import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { STATIC_CITIES } from '../config';

let particulatesChart: Chart | null = null;
let cachedDashboardPayload: any = null;
let dashboardMode: 'basic' | 'advanced' = 'basic';
let dashboardHorizon: 'historical' | 'forecast' = 'historical';
let selectedMetrics: Set<string> = new Set(['pm2_5', 'pm10']);

const getStyleColor = (varName: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

const pollutantMeta: Record<string, { label: string; cssVar: string; fallback: string; yAxisID: 'y' | 'y1' }> = {
  pm2_5: { label: 'PM 2.5', cssVar: '--pm25-color', fallback: '#f38ba8', yAxisID: 'y' },
  pm10: { label: 'PM 10', cssVar: '--pm10-color', fallback: '#74c7ec', yAxisID: 'y' },
  nitrogen_dioxide: { label: 'NO₂', cssVar: '--no2-color', fallback: '#f5c2e7', yAxisID: 'y' },
  ozone: { label: 'O₃', cssVar: '--ozone-color', fallback: '#f9e2af', yAxisID: 'y' },
  sulphur_dioxide: { label: 'SO₂', cssVar: '--so2-color', fallback: '#cba6f7', yAxisID: 'y' },
  carbon_monoxide: { label: 'CO', cssVar: '--co-color', fallback: '#f2cdcd', yAxisID: 'y1' }
};

function getAqiGuidance(aqi: number | null | undefined) {
  if (aqi === null || aqi === undefined || isNaN(aqi)) {
    return {
      label: 'Unavailable',
      color: 'var(--text-muted)',
      bg: 'var(--ctp-surface1)',
      summary: 'Live Air Quality Index telemetry is temporarily unavailable for this station.'
    };
  }
  if (aqi <= 50) {
    return {
      label: 'Good',
      color: 'var(--ctp-green)',
      bg: 'rgba(166, 227, 161, 0.12)',
      summary: 'Air is clean and poses little or no health risk. Safe for all outdoor activities.'
    };
  }
  if (aqi <= 100) {
    return {
      label: 'Fair / Moderate',
      color: 'var(--ctp-yellow)',
      bg: 'rgba(249, 226, 175, 0.12)',
      summary: 'Air quality is acceptable for most people, though unusually sensitive individuals may notice mild irritation.'
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Sensitive Risk',
      color: 'var(--ctp-peach)',
      bg: 'rgba(250, 179, 135, 0.12)',
      summary: 'People with asthma, children, and older adults should reduce prolonged outdoor exertion.'
    };
  }
  return {
    label: 'Poor / Unhealthy',
    color: 'var(--ctp-red)',
    bg: 'rgba(243, 139, 168, 0.12)',
    summary: 'Elevated pollution detected. Everyone should limit heavy outdoor activity and consider wearing a mask.'
  };
}

export function renderDashboard() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem; display: flex; flex-direction: column;">
      <div class="header" style="margin-bottom: 1.75rem; text-align: left;">
        <h1 style="font-size: 2.25rem; margin: 0; letter-spacing: -0.02em;">Station Air Analytics</h1>
        <p style="color: var(--text-muted); font-size: 1rem; margin-top: 0.4rem; margin-bottom: 0;">
          Compare historical air quality trends and upcoming projections across global monitoring stations.
        </p>
      </div>

      <div class="controls-bar" style="justify-content: space-between; align-items: flex-end; flex-wrap: wrap;">
        <div style="display: flex; gap: 1rem; align-items: flex-end; flex: 1; min-width: 260px;">
          <div style="flex: 1; max-width: 340px;">
            <label for="cityDropdown" style="display: block; margin-bottom: 0.4rem; color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">Select Station</label>
            <select id="cityDropdown" style="width: 100%; height: 42px;">
              <option value="">Loading...</option>
            </select>
          </div>
          <button id="updateChartBtn" class="btn-primary" style="height: 42px;">Refresh</button>
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
    updateModeButtonStyles();
    renderDashboardBody();
  });

  document.getElementById('dashAdvBtn')?.addEventListener('click', () => {
    if (dashboardMode === 'advanced') return;
    dashboardMode = 'advanced';
    updateModeButtonStyles();
    renderDashboardBody();
  });
}

function updateModeButtonStyles() {
  document.getElementById('dashBasicBtn')?.classList.toggle('active', dashboardMode === 'basic');
  document.getElementById('dashAdvBtn')?.classList.toggle('active', dashboardMode === 'advanced');
}

function populateCities() {
  const dropdown = document.getElementById('cityDropdown') as HTMLSelectElement;
  if (!dropdown) return;

  dropdown.innerHTML = STATIC_CITIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const lastId = localStorage.getItem('selectedCityId');
  const validIds = STATIC_CITIES.map(c => String(c.id));

  if (lastId && validIds.includes(lastId)) {
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
  const targetCity = STATIC_CITIES.find(c => String(c.id) === String(cityId));
  if (!targetCity) return;

  contentContainer.innerHTML = `
    <div class="aqi-card" style="text-align: center; padding: 3rem;">
      <p style="color: var(--text-muted); margin: 0;">Loading station telemetry for ${targetCity.name}...</p>
    </div>
  `;

  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${targetCity.lat}&longitude=${targetCity.lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&hourly=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&past_days=5&forecast_days=5`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Unable to fetch station telemetry.');
    const json = await res.json();

    cachedDashboardPayload = {
      city: targetCity,
      current: json.current || {},
      hourly: json.hourly || {}
    };

    renderDashboardBody();
  } catch (err: any) {
    contentContainer.innerHTML = `
      <div class="aqi-card" style="text-align: center; padding: 2rem;">
        <p style="color: var(--error-color); font-weight: 600; margin: 0;">${err.message || 'Failed to update dashboard trends.'}</p>
      </div>
    `;
  }
}

function renderDashboardBody() {
  const contentContainer = document.getElementById('dashboardDynamicContent');
  if (!contentContainer || !cachedDashboardPayload) return;

  const { city, current } = cachedDashboardPayload;
  const aqiVal = current.us_aqi !== undefined && current.us_aqi !== null ? Math.round(current.us_aqi) : null;
  const guidance = getAqiGuidance(aqiVal);

  const basicOverviewHtml = dashboardMode === 'basic' ? `
    <div class="aqi-hero-grid">
      <div class="aqi-card" style="border-top: 4px solid ${guidance.color};">
        <div>
          <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">
            Current General AQI — ${city.name}
          </span>
          <div class="aqi-score-row">
            <span class="aqi-score-number">${aqiVal !== null ? aqiVal : '--'}</span>
            <span class="status-pill" style="background: ${guidance.bg}; color: ${guidance.color};">${guidance.label}</span>
          </div>
        </div>
        <p style="margin: 0; font-size: 0.82rem; color: var(--text-muted);">
          Scale: 0–50 Good • 51–100 Fair • 101–150 Sensitive Risk • 151+ Poor
        </p>
      </div>

      <div class="aqi-card" style="gap: 0.85rem;">
        <div>
          <h3 style="margin: 0 0 0.3rem 0; font-size: 0.85rem; text-transform: uppercase; color: var(--accent);">What is General AQI?</h3>
          <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted);">
            The <strong>Air Quality Index (AQI)</strong> summarizes major pollutants into a single 0–500 health score so you can assess air safety without decoding raw chemical units.
          </p>
        </div>
        <div style="border-top: 1px solid var(--border-muted); padding-top: 0.85rem;">
          <h3 style="margin: 0 0 0.3rem 0; font-size: 0.85rem; text-transform: uppercase; color: ${guidance.color};">Plain-Language Interpretation</h3>
          <p style="margin: 0; font-size: 0.92rem; color: var(--text-main);">${guidance.summary}</p>
        </div>
      </div>
    </div>
  ` : '';

  const pollutantCheckboxesHtml = dashboardMode === 'advanced' ? `
    <div class="checkbox-group" style="flex-wrap: wrap; gap: 1rem; font-size: 0.88rem;">
      ${Object.entries(pollutantMeta).map(([key, meta]) => `
        <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
          <input type="checkbox" class="particulate-check" value="${key}" ${selectedMetrics.has(key) ? 'checked' : ''} style="cursor: pointer;">
          ${meta.label}
        </label>
      `).join('')}
    </div>
  ` : '';

  contentContainer.innerHTML = `
    ${basicOverviewHtml}

    <div class="timeline-panel" style="background: var(--bg-card);">
      <div class="timeline-panel-header">
        <div>
          <h2 style="margin: 0; color: var(--text-main); font-size: 1.25rem; font-weight: 600;">
            ${dashboardMode === 'basic' ? `General AQI Trend — ${city.name}` : `Multi-Pollutant Mass Fractions — ${city.name}`}
          </h2>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.82rem; color: var(--text-muted);">
            ${dashboardMode === 'basic'
              ? 'Switch between past observations and upcoming air quality forecasts.'
              : 'Toggle individual gases and particulates below to compare concentration trends.'}
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <div class="segmented-toggle">
            <button id="dashHistBtn" class="segmented-btn ${dashboardHorizon === 'historical' ? 'active' : ''}">Historical (Past 5d)</button>
            <button id="dashForeBtn" class="segmented-btn ${dashboardHorizon === 'forecast' ? 'active' : ''}">Forecast (Next 5d)</button>
          </div>
        </div>
      </div>

      ${dashboardMode === 'advanced' ? `<div style="margin-bottom: 1.25rem;">${pollutantCheckboxesHtml}</div>` : ''}

      <div class="chart-wrapper" style="position: relative; height: 400px; width: 100%;">
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

  document.querySelectorAll('.particulate-check').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.checked) {
        selectedMetrics.add(input.value);
      } else if (selectedMetrics.size > 1) {
        selectedMetrics.delete(input.value);
      } else {
        input.checked = true; // Keep at least one series active
        return;
      }
      buildDashboardChart();
    });
  });

  buildDashboardChart();
}

function buildDashboardChart() {
  const pCanvas = document.getElementById('particulatesChartCanvas') as HTMLCanvasElement;
  if (!pCanvas || !cachedDashboardPayload?.hourly) return;

  if (particulatesChart) {
    particulatesChart.destroy();
    particulatesChart = null;
  }

  const hourly = cachedDashboardPayload.hourly;
  const now = Date.now();
  const indices: number[] = [];

  hourly.time.forEach((tStr: string, idx: number) => {
    const ts = new Date(tStr).getTime();
    if (dashboardHorizon === 'historical' && ts <= now) indices.push(idx);
    if (dashboardHorizon === 'forecast' && ts > now) indices.push(idx);
  });

  const labels = indices.map(idx => new Date(hourly.time[idx]));

  let datasets: any[] = [];
  let showSecondaryAxis = false;

  if (dashboardMode === 'basic') {
    const accentColor = getStyleColor('--accent') || '#89b4fa';
    datasets = [{
      label: 'General AQI',
      data: indices.map(idx => hourly.us_aqi?.[idx] ?? null),
      borderColor: accentColor,
      backgroundColor: accentColor + '15',
      yAxisID: 'y',
      tension: 0.2,
      borderWidth: 2,
      pointRadius: indices.length > 100 ? 0 : 2,
      spanGaps: true
    }];
  } else {
    showSecondaryAxis = selectedMetrics.has('carbon_monoxide') && selectedMetrics.size > 1;
    datasets = Array.from(selectedMetrics).map(key => {
      const meta = pollutantMeta[key];
      const color = getStyleColor(meta.cssVar) || meta.fallback;
      return {
        label: `${meta.label} (µg/m³)`,
        data: indices.map(idx => hourly[key]?.[idx] ?? null),
        borderColor: color,
        backgroundColor: color + '10',
        yAxisID: showSecondaryAxis ? meta.yAxisID : 'y',
        tension: 0.15,
        borderWidth: 2,
        pointRadius: indices.length > 100 ? 0 : 2,
        spanGaps: true
      };
    });
  }

  const scalesConfig: any = {
    x: {
      type: 'time',
      time: { unit: 'hour', displayFormats: { hour: 'MMM d, h a' } },
      ticks: {
        color: getStyleColor('--text-muted'),
        maxTicksLimit: 8,
        maxRotation: 0,
        minRotation: 0
      },
      grid: { color: `color-mix(in srgb, ${getStyleColor('--border-muted')} 15%, transparent)` }
    },
    y: {
      type: 'linear',
      position: 'left',
      beginAtZero: true,
      title: {
        display: true,
        text: dashboardMode === 'basic' ? 'General AQI' : 'Concentration (µg/m³)',
        color: getStyleColor('--text-main')
      },
      ticks: {
        color: getStyleColor('--text-muted'),
        callback: (value: any) => Number(value).toLocaleString()
      },
      grid: { color: `color-mix(in srgb, ${getStyleColor('--border-muted')} 15%, transparent)` }
    }
  };

  if (showSecondaryAxis) {
    scalesConfig.y1 = {
      type: 'linear',
      position: 'right',
      beginAtZero: true,
      title: {
        display: true,
        text: 'CO (µg/m³)',
        color: getStyleColor('--co-color') || '#f2cdcd'
      },
      ticks: {
        color: getStyleColor('--co-color') || '#f2cdcd',
        callback: (value: any) => Number(value).toLocaleString()
      },
      grid: { drawOnChartArea: false }
    };
  }

  particulatesChart = new Chart(pCanvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      scales: scalesConfig,
      plugins: {
        legend: { labels: { color: getStyleColor('--text-main'), usePointStyle: true } },
        tooltip: {
          backgroundColor: getStyleColor('--bg-dark') || '#11111b',
          borderColor: getStyleColor('--border-muted'),
          borderWidth: 1
        }
      }
    }
  });
}
