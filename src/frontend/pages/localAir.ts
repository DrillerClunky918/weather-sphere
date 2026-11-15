import Chart from 'chart.js/auto';
import {
  POLLUTANTS,
  POLLUTANT_LIST,
  TimeHorizon,
  getPollutantStatus,
  renderBasicAqiCards,
  renderHorizonToggle,
  buildLineChart,
  syncUserDetectedCity
} from '../config';

let localChartInstance: Chart | null = null;
let currentTimelineData: any = null;
let currentSnapshotData: any = null;
let activeTimelineMetric: string = 'pm2_5';
let activeDisplayMode: 'mean' | 'current' = 'mean';
let activeExperienceMode: 'basic' | 'advanced' = 'basic';
let activeTimeHorizon: TimeHorizon = 'both';
let isEditingLocation: boolean = false;

let activeLocation: {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isManual: boolean;
} | null = null;

export async function renderLocalAir() {
  window.removeEventListener('themechange', handleThemeRedraw);
  window.addEventListener('themechange', handleThemeRedraw);
  await loadLocalAirData();
}

function handleThemeRedraw() {
  if (document.getElementById('localTimelineCanvas')) {
    buildTimelineChart();
  }
}

async function loadLocalAirData(overrideCity?: string) {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container">
      <p class="status-msg">Loading local air quality data...</p>
    </div>
  `;

  try {
    let targetCity = overrideCity?.trim() || (activeLocation?.isManual ? activeLocation.city : '');
    let detectedCountry = '';

    if (!targetCity) {
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.city) targetCity = ipData.city;
          if (ipData.country_name) detectedCountry = ipData.country_name;
        }
      } catch {
        // Blocked by browser privacy rules or unavailable
      }
    }

    if (!targetCity) {
      renderLocationPrompt(
        'Automatic location detection was blocked by your browser or network. Enter your city below to view local air quality.'
      );
      return;
    }

    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(targetCity)}&count=1&language=en&format=json`
    );
    const geoData = await geoRes.json();
    if (!geoData.results?.length) {
      throw new Error(`Could not find coordinates for "${targetCity}".`);
    }

    const { latitude, longitude, name, country, country_code } = geoData.results[0];
    const resolvedCountry = country || detectedCountry;

    activeLocation = {
      city: name,
      country: resolvedCountry,
      latitude,
      longitude,
      isManual: Boolean(overrideCity || activeLocation?.isManual)
    };

    syncUserDetectedCity({
      name,
      state: country_code || resolvedCountry.slice(0, 3).toUpperCase() || 'LOC',
      lat: latitude,
      lon: longitude
    });

    const aqRes = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&past_days=7&forecast_days=7`
    );
    const aqData = await aqRes.json();

    currentTimelineData = aqData?.hourly || null;
    currentSnapshotData = aqData?.current || {};
    isEditingLocation = false;

    renderPageLayout();
  } catch (err: any) {
    renderLocationPrompt(err.message || 'Unable to find that location.');
  }
}

function renderLocationPrompt(notice: string) {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container container-narrow">
      <div class="aqi-card">
        <div class="header">
          <h1>Your City's Air Quality</h1>
          <p class="subtitle">${notice}</p>
        </div>
        <form id="initialCityForm" class="inline-city-form full-width">
          <input type="text" id="initialCityInput" placeholder="Enter your city (e.g., London, Paris, Tokyo)..." required />
          <button type="submit" class="btn-primary">Load Air</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('initialCityForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('initialCityInput') as HTMLInputElement;
    if (input?.value.trim()) loadLocalAirData(input.value.trim());
  });
}

function getComputedMetricValue(key: string): number | null {
  if (activeDisplayMode === 'mean') {
    const times: string[] = currentTimelineData?.time || [];
    const values: any[] = currentTimelineData?.[key] || [];
    const now = Date.now();
    const past24h = values.filter((v, idx) => {
      if (v === null || v === undefined) return false;
      const t = new Date(times[idx]).getTime();
      return t <= now && t >= now - 24 * 60 * 60 * 1000;
    });

    if (past24h.length > 0) {
      const avg = past24h.reduce((sum: number, v: number) => sum + v, 0) / past24h.length;
      return key === 'us_aqi' ? Math.round(avg) : parseFloat(avg.toFixed(1));
    }
  }

  const rawVal = currentSnapshotData?.[key];
  if (rawVal === undefined || rawVal === null) return null;
  return key === 'us_aqi' ? Math.round(rawVal) : parseFloat(rawVal.toFixed(1));
}

function renderPageLayout() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet || !activeLocation) return;

  const { city, country, latitude, longitude, isManual } = activeLocation;
  const windowLabel = activeDisplayMode === 'mean' ? 'Past 24h Average AQI' : 'Current General AQI';

  outlet.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>Your City's Air Quality</h1>
        <div class="location-meta-row">
          <span class="subtitle">
            ${city}${country ? `, ${country}` : ''} (${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E)
          </span>
          <span class="status-pill text-accent">${isManual ? 'Manual' : 'Auto-Detected'}</span>
          <button id="toggleEditCityBtn" class="btn-ghost">
            ${isEditingLocation ? 'Cancel' : 'Change City'}
          </button>
        </div>

        ${isEditingLocation ? `
          <form id="overrideCityForm" class="inline-city-form">
            <input type="text" id="overrideCityInput" placeholder="Enter city..." value="${city}" required />
            <button type="submit" class="btn-primary">Apply</button>
            ${isManual ? `<button type="button" id="resetAutoLocationBtn" class="btn-ghost">Auto</button>` : ''}
          </form>
        ` : ''}
      </div>

      <div class="controls-bar controls-center">
        <div class="segmented-toggle">
          <button id="toggleBasicExp" class="segmented-btn ${activeExperienceMode === 'basic' ? 'active' : ''}">Basic Mode</button>
          <button id="toggleAdvancedExp" class="segmented-btn ${activeExperienceMode === 'advanced' ? 'active' : ''}">Advanced Mode</button>
        </div>

        <div class="segmented-toggle">
          <button id="toggleMeanMode" class="segmented-btn ${activeDisplayMode === 'mean' ? 'active' : ''}">Past 24h Average</button>
          <button id="toggleCurrentMode" class="segmented-btn ${activeDisplayMode === 'current' ? 'active' : ''}">Current Reading</button>
        </div>
      </div>

      ${
        activeExperienceMode === 'basic'
          ? renderBasicAqiCards(getComputedMetricValue('us_aqi'), windowLabel)
          : renderAdvancedViewHtml()
      }

      <div class="timeline-panel">
        <div class="timeline-panel-header">
          <div>
            <h2 class="section-title">
              ${activeExperienceMode === 'basic' ? 'General AQI Trend' : `${POLLUTANTS[activeTimelineMetric].label} Trend`}
            </h2>
            <p class="subtitle">Solid line shows past observations; dashed line shows 7-day forecast.</p>
          </div>
          ${renderHorizonToggle(activeTimeHorizon, {
            hist: 'toggleHistoricalBtn',
            both: 'toggleBothBtn',
            fore: 'toggleForecastBtn'
          })}
        </div>

        <div class="chart-wrapper chart-wrapper-md">
          <canvas id="localTimelineCanvas"></canvas>
        </div>
      </div>
    </div>
  `;

  buildTimelineChart();
  setupPageListeners();
}

function renderAdvancedViewHtml(): string {
  const labelText = activeDisplayMode === 'mean' ? 'Past 24h Average' : 'Current Reading';
  const activeMeta = POLLUTANTS[activeTimelineMetric];

  const cardsHtml = POLLUTANT_LIST.map((meta) => {
    const val = getComputedMetricValue(meta.key);
    const status = getPollutantStatus(meta.key, val);

    return `
      <div class="info-card metric-selector-btn accent-${meta.key} ${activeTimelineMetric === meta.key ? 'active-card' : ''}" data-metric="${meta.key}">
        <h3>${meta.label}</h3>
        <div class="metric-sub">${labelText}</div>
        <div class="metric-val">
          ${val !== null ? `${val} <span class="metric-unit">${meta.unit}</span>` : '--'}
        </div>
        <span class="status-pill status-${status.tier}">${status.label}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="info-grid">${cardsHtml}</div>
    <div id="interpretationBox" class="guidance-banner">
      <h4 class="card-kicker title-${activeMeta.key}">
        ${activeMeta.label} Guide (Click any pollutant card above to view its trend)
      </h4>
      <p class="subtitle">${activeMeta.guide}</p>
    </div>
  `;
}

function buildTimelineChart() {
  const ctx = document.getElementById('localTimelineCanvas') as HTMLCanvasElement;
  if (!ctx || !currentTimelineData?.time) return;

  const isBasic = activeExperienceMode === 'basic';
  const metricKey = isBasic ? 'us_aqi' : activeTimelineMetric;
  const meta = POLLUTANTS[metricKey];

  localChartInstance = buildLineChart(
    ctx,
    localChartInstance,
    currentTimelineData.time,
    activeTimeHorizon,
    [
      {
        label: isBasic ? 'General AQI' : `${meta.label} (${meta.unit})`,
        data: currentTimelineData[metricKey] || [],
        cssVar: isBasic ? '--accent' : meta.cssVar
      }
    ],
    isBasic ? 'General AQI' : `${meta.shortLabel} (${meta.unit})`
  );
}

function setupPageListeners() {
  document.getElementById('toggleEditCityBtn')?.addEventListener('click', () => {
    isEditingLocation = !isEditingLocation;
    renderPageLayout();
  });

  document.getElementById('overrideCityForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('overrideCityInput') as HTMLInputElement;
    if (input?.value.trim()) loadLocalAirData(input.value.trim());
  });

  document.getElementById('resetAutoLocationBtn')?.addEventListener('click', () => {
    activeLocation = null;
    loadLocalAirData();
  });

  document.getElementById('toggleBasicExp')?.addEventListener('click', () => {
    if (activeExperienceMode !== 'basic') {
      activeExperienceMode = 'basic';
      renderPageLayout();
    }
  });

  document.getElementById('toggleAdvancedExp')?.addEventListener('click', () => {
    if (activeExperienceMode !== 'advanced') {
      activeExperienceMode = 'advanced';
      renderPageLayout();
    }
  });

  document.getElementById('toggleMeanMode')?.addEventListener('click', () => {
    if (activeDisplayMode !== 'mean') {
      activeDisplayMode = 'mean';
      renderPageLayout();
    }
  });

  document.getElementById('toggleCurrentMode')?.addEventListener('click', () => {
    if (activeDisplayMode !== 'current') {
      activeDisplayMode = 'current';
      renderPageLayout();
    }
  });

  document.getElementById('toggleHistoricalBtn')?.addEventListener('click', () => {
    if (activeTimeHorizon !== 'historical') {
      activeTimeHorizon = 'historical';
      renderPageLayout();
    }
  });

  document.getElementById('toggleBothBtn')?.addEventListener('click', () => {
    if (activeTimeHorizon !== 'both') {
      activeTimeHorizon = 'both';
      renderPageLayout();
    }
  });

  document.getElementById('toggleForecastBtn')?.addEventListener('click', () => {
    if (activeTimeHorizon !== 'forecast') {
      activeTimeHorizon = 'forecast';
      renderPageLayout();
    }
  });

  document.querySelectorAll('.metric-selector-btn').forEach((card) => {
    card.addEventListener('click', () => {
      activeTimelineMetric = card.getAttribute('data-metric') || 'pm2_5';
      renderPageLayout();
    });
  });
}
