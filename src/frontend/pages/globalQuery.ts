import Chart from 'chart.js/auto';
import {
  POLLUTANTS,
  POLLUTANT_LIST,
  TimeHorizon,
  getPollutantStatus,
  renderBasicAqiCards,
  renderHorizonToggle,
  buildLineChart
} from '../config';

let searchMode: 'basic' | 'advanced' = 'basic';
let searchHorizon: TimeHorizon = 'both';
let activeSearchMetric: string = 'pm2_5';
let lastSearchPayload: any = null;
let searchChartInstance: Chart | null = null;

export function renderGlobalQuery() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>Live Search</h1>
        <p class="subtitle">Search any city worldwide to check its General AQI, 7-day trends, and pollutant breakdown.</p>
      </div>

      <div class="aqi-card container-medium">
        <form id="auditForm" class="inline-city-form full-width">
          <input type="text" id="cityInput" placeholder="Enter a city (e.g., Paris, Reading, Tokyo)..." required />
          <button type="submit" id="auditBtn" class="btn-primary">Search Location</button>
        </form>
        <div id="auditOutput"></div>
      </div>
    </div>
  `;

  document.getElementById('auditForm')?.addEventListener('submit', handleAuditSubmit);

  window.removeEventListener('themechange', handleThemeRedraw);
  window.addEventListener('themechange', handleThemeRedraw);
}

function handleThemeRedraw() {
  if (document.getElementById('searchTimelineCanvas')) {
    renderSearchChart();
  }
}

async function handleAuditSubmit(e: Event) {
  e.preventDefault();
  const input = document.getElementById('cityInput') as HTMLInputElement;
  const output = document.getElementById('auditOutput');
  const button = document.getElementById('auditBtn') as HTMLButtonElement;

  if (!input || !output || !button) return;

  const cityQuery = input.value.trim();
  button.disabled = true;
  button.innerText = 'Searching...';
  output.innerHTML = `<p class="status-msg">Searching for location...</p>`;

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) throw new Error('Location lookup service unavailable.');
    const geoData = await geoRes.json();

    if (!geoData.results?.length) {
      throw new Error(`No coordinates found for "${cityQuery}".`);
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const aqRes = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&past_days=7&forecast_days=7`
    );
    if (!aqRes.ok) throw new Error('Air quality data unavailable.');
    const aqData = await aqRes.json();

    if (!aqData.current) {
      throw new Error('No live readings available for this station.');
    }

    input.value = `${name}, ${country}`;
    lastSearchPayload = {
      name,
      country,
      latitude,
      longitude,
      current: aqData.current,
      hourly: aqData.hourly
    };

    renderSearchResult();
  } catch (err: any) {
    output.innerHTML = `<p class="status-msg error">${err.message}</p>`;
  } finally {
    button.disabled = false;
    button.innerText = 'Search Location';
  }
}

function renderSearchResult() {
  const output = document.getElementById('auditOutput');
  if (!output || !lastSearchPayload) return;

  const { name, country, latitude, longitude, current } = lastSearchPayload;
  const pm25 = current.pm2_5;
  const pm10 = current.pm10;
  const dataFailedIntegrity = pm25 !== null && pm10 !== null && pm25 > pm10;

  const alertMarkup = dataFailedIntegrity
    ? `<div class="guidance-banner alert-error">
        ⚠ Sensor Warning: PM 2.5 (${pm25} µg/m³) exceeds PM 10 (${pm10} µg/m³). Readings may be skewed.
      </div>`
    : '';

  const activeMeta = POLLUTANTS[activeSearchMetric];
  const advancedPollutantCards = POLLUTANT_LIST.map((meta) => {
    const val = current[meta.key];
    const displayVal = val !== undefined && val !== null ? val.toFixed(1) : '--';
    const status = getPollutantStatus(meta.key, val);

    return `
      <div class="info-card search-metric-card accent-${meta.key} ${activeSearchMetric === meta.key ? 'active-card' : ''}" data-metric="${meta.key}">
        <h3>${meta.label}</h3>
        <div class="metric-val">
          ${displayVal} <span class="metric-unit">${meta.unit}</span>
        </div>
        <span class="status-pill status-${status.tier}">${status.label}</span>
      </div>
    `;
  }).join('');

  const advancedOverviewHtml = `
    <div class="info-grid">${advancedPollutantCards}</div>
    <div class="guidance-banner">
      <h4 class="card-kicker title-${activeMeta.key}">
        ${activeMeta.label} Guide (Click any pollutant card above to view its trend)
      </h4>
      <p class="subtitle">${activeMeta.guide}</p>
    </div>
    ${alertMarkup}
  `;

  output.innerHTML = `
    <div class="result-divider">
      <div class="timeline-panel-header">
        <div>
          <h3 class="section-title">${name} (${country})</h3>
          <p class="subtitle">Coordinates: ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E</p>
        </div>

        <div class="segmented-toggle">
          <button id="searchBasicBtn" class="segmented-btn ${searchMode === 'basic' ? 'active' : ''}">Basic Mode</button>
          <button id="searchAdvBtn" class="segmented-btn ${searchMode === 'advanced' ? 'active' : ''}">Advanced Mode</button>
        </div>
      </div>

      ${searchMode === 'basic' ? renderBasicAqiCards(current.us_aqi, 'General AQI') : advancedOverviewHtml}

      <div class="timeline-panel">
        <div class="timeline-panel-header">
          <div>
            <span class="card-kicker">
              ${searchMode === 'basic' ? 'General AQI Trend' : `${activeMeta.label} Trend`}
            </span>
            <p class="subtitle">Solid line shows past observations; dashed line shows 7-day forecast.</p>
          </div>
          ${renderHorizonToggle(searchHorizon, {
            hist: 'searchHistBtn',
            both: 'searchBothBtn',
            fore: 'searchForeBtn'
          })}
        </div>
        <div class="chart-wrapper chart-wrapper-sm">
          <canvas id="searchTimelineCanvas"></canvas>
        </div>
      </div>
    </div>
  `;

  document.getElementById('searchBasicBtn')?.addEventListener('click', () => {
    searchMode = 'basic';
    renderSearchResult();
  });

  document.getElementById('searchAdvBtn')?.addEventListener('click', () => {
    searchMode = 'advanced';
    renderSearchResult();
  });

  document.getElementById('searchHistBtn')?.addEventListener('click', () => {
    searchHorizon = 'historical';
    renderSearchResult();
  });

  document.getElementById('searchBothBtn')?.addEventListener('click', () => {
    searchHorizon = 'both';
    renderSearchResult();
  });

  document.getElementById('searchForeBtn')?.addEventListener('click', () => {
    searchHorizon = 'forecast';
    renderSearchResult();
  });

  document.querySelectorAll('.search-metric-card').forEach((card) => {
    card.addEventListener('click', () => {
      activeSearchMetric = card.getAttribute('data-metric') || 'pm2_5';
      renderSearchResult();
    });
  });

  renderSearchChart();
}

function renderSearchChart() {
  const ctx = document.getElementById('searchTimelineCanvas') as HTMLCanvasElement;
  if (!ctx || !lastSearchPayload?.hourly?.time) return;

  const isBasic = searchMode === 'basic';
  const metricKey = isBasic ? 'us_aqi' : activeSearchMetric;
  const meta = POLLUTANTS[metricKey];

  searchChartInstance = buildLineChart(
    ctx,
    searchChartInstance,
    lastSearchPayload.hourly.time,
    searchHorizon,
    [
      {
        label: isBasic ? 'General AQI' : `${meta.label} (${meta.unit})`,
        data: lastSearchPayload.hourly[metricKey] || [],
        cssVar: isBasic ? '--accent' : meta.cssVar
      }
    ],
    isBasic ? 'General AQI' : `${meta.shortLabel} (${meta.unit})`
  );
}
