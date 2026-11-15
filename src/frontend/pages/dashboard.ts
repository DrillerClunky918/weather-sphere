import Chart from 'chart.js/auto';
import {
  CityStation,
  POLLUTANTS,
  POLLUTANT_LIST,
  TimeHorizon,
  getTrackedCities,
  getAqiGuidance,
  getPollutantStatus,
  renderBasicAqiCards,
  renderHorizonToggle,
  buildLineChart,
  ChartSeriesInput
} from '../config';

let particulatesChart: Chart | null = null;
let cachedCityPayloads: { city: CityStation; current: any; hourly: any }[] = [];
let selectedCityIds: string[] = [];
let dashboardMode: 'basic' | 'advanced' = 'basic';
let dashboardHorizon: TimeHorizon = 'both';
let activeSingleMetric: string = 'pm2_5';
let activeCompareMetric: string = 'pm2_5';

const CITY_SERIES_VARS = ['--accent', '--accent-secondary', '--status-good'];

export function renderDashboard() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  const availableCities = getTrackedCities();
  if (selectedCityIds.length === 0) {
    const savedId = localStorage.getItem('selectedCityId');
    const initial =
      availableCities.find((c) => String(c.id) === savedId) || availableCities[0];
    if (initial) selectedCityIds = [String(initial.id)];
  } else {
    selectedCityIds = selectedCityIds.filter((id) =>
      availableCities.some((c) => String(c.id) === id)
    );
    if (selectedCityIds.length === 0 && availableCities[0]) {
      selectedCityIds = [String(availableCities[0].id)];
    }
  }

  renderDashboardShell();
  fetchAndRenderDashboard();

  window.removeEventListener('themechange', handleThemeRedraw);
  window.addEventListener('themechange', handleThemeRedraw);
}

function handleThemeRedraw() {
  if (document.getElementById('particulatesChartCanvas')) {
    buildDashboardChart();
  }
}

function renderDashboardShell() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  const availableCities = getTrackedCities();

  const citySelectorsHtml = selectedCityIds
    .map((selectedId, idx) => {
      const optionsHtml = availableCities
        .map(
          (c) =>
            `<option value="${c.id}" ${String(c.id) === selectedId ? 'selected' : ''}>${c.name}${c.isUserCity ? ' (You)' : ''}</option>`
        )
        .join('');

      return `
        <div class="city-slot-group">
          <select class="dash-city-select" data-slot="${idx}" aria-label="Station ${idx + 1}">
            ${optionsHtml}
          </select>
          ${
            idx > 0
              ? `<button type="button" class="btn-ghost remove-slot-btn" data-slot="${idx}" title="Remove station">×</button>`
              : ''
          }
        </div>
      `;
    })
    .join('');

  const canAddMore = selectedCityIds.length < 3 && availableCities.length > selectedCityIds.length;

  outlet.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>Station Air Analytics</h1>
        <p class="subtitle">Compare up to 3 cities across 7-day historical records and 7-day forecasts.</p>
      </div>

      <div class="controls-bar controls-between">
        <div>
          <span class="field-label">Select Stations (${selectedCityIds.length}/3)</span>
          <div class="control-row">
            ${citySelectorsHtml}
            ${
              canAddMore
                ? `<button type="button" id="addCitySlotBtn" class="btn-ghost btn-add-city" title="Compare another city">+</button>`
                : ''
            }
            <button type="button" id="updateChartBtn" class="btn-primary">Refresh</button>
          </div>
        </div>

        <div class="segmented-toggle">
          <button id="dashBasicBtn" class="segmented-btn ${dashboardMode === 'basic' ? 'active' : ''}">Basic Mode</button>
          <button id="dashAdvBtn" class="segmented-btn ${dashboardMode === 'advanced' ? 'active' : ''}">Advanced Mode</button>
        </div>
      </div>

      <div id="dashboardDynamicContent"></div>
    </div>
  `;

  document.querySelectorAll('.dash-city-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const slot = Number(target.dataset.slot);
      selectedCityIds[slot] = target.value;
      if (slot === 0) localStorage.setItem('selectedCityId', target.value);
      fetchAndRenderDashboard();
    });
  });

  document.querySelectorAll('.remove-slot-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const slot = Number((btn as HTMLElement).dataset.slot);
      selectedCityIds.splice(slot, 1);
      renderDashboardShell();
      fetchAndRenderDashboard();
    });
  });

  document.getElementById('addCitySlotBtn')?.addEventListener('click', () => {
    if (selectedCityIds.length >= 3) return;
    const nextCity = availableCities.find((c) => !selectedCityIds.includes(String(c.id)));
    if (nextCity) {
      selectedCityIds.push(String(nextCity.id));
      renderDashboardShell();
      fetchAndRenderDashboard();
    }
  });

  document.getElementById('updateChartBtn')?.addEventListener('click', fetchAndRenderDashboard);

  document.getElementById('dashBasicBtn')?.addEventListener('click', () => {
    if (dashboardMode === 'basic') return;
    dashboardMode = 'basic';
    document.getElementById('dashBasicBtn')?.classList.toggle('active', true);
    document.getElementById('dashAdvBtn')?.classList.toggle('active', false);
    renderDashboardBody();
  });

  document.getElementById('dashAdvBtn')?.addEventListener('click', () => {
    if (dashboardMode === 'advanced') return;
    dashboardMode = 'advanced';
    document.getElementById('dashBasicBtn')?.classList.toggle('active', false);
    document.getElementById('dashAdvBtn')?.classList.toggle('active', true);
    renderDashboardBody();
  });
}

async function fetchAndRenderDashboard() {
  const contentContainer = document.getElementById('dashboardDynamicContent');
  if (!contentContainer) return;

  const availableCities = getTrackedCities();
  const targetCities = selectedCityIds
    .map((id) => availableCities.find((c) => String(c.id) === id))
    .filter((c): c is CityStation => Boolean(c));

  if (!targetCities.length) return;

  contentContainer.innerHTML = `<div class="aqi-card"><p class="status-msg">Loading air quality data...</p></div>`;

  try {
    const payloads = await Promise.all(
      targetCities.map(async (city) => {
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&hourly=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&past_days=7&forecast_days=7`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Unable to fetch data for ${city.name}.`);
        const json = await res.json();
        return {
          city,
          current: json.current || {},
          hourly: json.hourly || {}
        };
      })
    );

    cachedCityPayloads = payloads;
    renderDashboardBody();
  } catch (err: any) {
    contentContainer.innerHTML = `<div class="aqi-card"><p class="status-msg error">${err.message || 'Failed to load station trends.'}</p></div>`;
  }
}

function renderDashboardBody() {
  const contentContainer = document.getElementById('dashboardDynamicContent');
  if (!contentContainer || !cachedCityPayloads.length) return;

  const isMultiCity = cachedCityPayloads.length > 1;
  let overviewHtml = '';

  if (!isMultiCity) {
    const { city, current } = cachedCityPayloads[0];
    if (dashboardMode === 'basic') {
      overviewHtml = renderBasicAqiCards(current.us_aqi, `Current General AQI — ${city.name}`);
    } else {
      const activeMeta = POLLUTANTS[activeSingleMetric];
      const cardsHtml = POLLUTANT_LIST.map((meta) => {
        const val = current[meta.key];
        const displayVal = val !== undefined && val !== null ? parseFloat(val.toFixed(1)) : null;
        const status = getPollutantStatus(meta.key, displayVal);

        return `
          <div class="info-card dash-single-metric accent-${meta.key} ${activeSingleMetric === meta.key ? 'active-card' : ''}" data-metric="${meta.key}">
            <h3>${meta.label}</h3>
            <div class="metric-sub">Current Reading</div>
            <div class="metric-val">
              ${displayVal !== null ? `${displayVal} <span class="metric-unit">${meta.unit}</span>` : '--'}
            </div>
            <span class="status-pill status-${status.tier}">${status.label}</span>
          </div>
        `;
      }).join('');

      overviewHtml = `
        <div class="info-grid">${cardsHtml}</div>
        <div class="guidance-banner">
          <h4 class="card-kicker title-${activeMeta.key}">
            ${activeMeta.label} Guide (Click any pollutant card above to view its trend)
          </h4>
          <p class="subtitle">${activeMeta.guide}</p>
        </div>
      `;
    }
  } else {
    const comparisonCards = cachedCityPayloads
      .map(({ city, current }) => {
        if (dashboardMode === 'basic') {
          const aqi = current.us_aqi;
          const guidance = getAqiGuidance(aqi);
          return `
            <div class="aqi-card border-top-${guidance.tier}">
              <div>
                <span class="card-kicker text-muted">${city.name}, ${city.state}</span>
                <div class="aqi-score-row">
                  <span class="aqi-score-number">${aqi !== null && aqi !== undefined ? Math.round(aqi) : '--'}</span>
                  <span class="status-pill status-${guidance.tier}">${guidance.label}</span>
                </div>
              </div>
              <p class="subtitle">${guidance.summary}</p>
            </div>
          `;
        } else {
          const meta = POLLUTANTS[activeCompareMetric];
          const val = current[meta.key];
          const displayVal = val !== undefined && val !== null ? parseFloat(val.toFixed(1)) : null;
          const status = getPollutantStatus(meta.key, displayVal);
          return `
            <div class="aqi-card border-top-${status.tier}">
              <div>
                <span class="card-kicker text-muted">${city.name}, ${city.state} — ${meta.shortLabel}</span>
                <div class="aqi-score-row">
                  <span class="aqi-score-number">${displayVal !== null ? displayVal : '--'}</span>
                  <span class="metric-unit">${meta.unit}</span>
                  <span class="status-pill status-${status.tier}">${status.label}</span>
                </div>
              </div>
              <p class="subtitle">Good ≤ ${meta.good} ${meta.unit} • Fair ≤ ${meta.fair} ${meta.unit}</p>
            </div>
          `;
        }
      })
      .join('');

    overviewHtml = `<div class="aqi-hero-grid">${comparisonCards}</div>`;
  }

  const metricSelectorBar =
    isMultiCity && dashboardMode === 'advanced'
      ? `<div class="checkbox-group">
          ${POLLUTANT_LIST.map(
            (meta) => `
              <button type="button" class="segmented-btn dash-compare-metric ${activeCompareMetric === meta.key ? 'active' : ''}" data-metric="${meta.key}">
                ${meta.shortLabel}
              </button>
            `
          ).join('')}
        </div>`
      : '';

  const chartHeading = isMultiCity
    ? dashboardMode === 'basic'
      ? 'General AQI Comparison'
      : `${POLLUTANTS[activeCompareMetric].label} Comparison`
    : dashboardMode === 'basic'
      ? `General AQI Trend — ${cachedCityPayloads[0].city.name}`
      : `${POLLUTANTS[activeSingleMetric].label} Trend — ${cachedCityPayloads[0].city.name}`;

  contentContainer.innerHTML = `
    ${overviewHtml}

    <div class="timeline-panel">
      <div class="timeline-panel-header">
        <div>
          <h2 class="section-title">${chartHeading}</h2>
          <p class="subtitle">Solid line shows past observations; dashed line shows 7-day forecast.</p>
        </div>

        ${renderHorizonToggle(dashboardHorizon, {
          hist: 'dashHistBtn',
          both: 'dashBothBtn',
          fore: 'dashForeBtn'
        })}
      </div>

      ${metricSelectorBar}

      <div class="chart-wrapper">
        <canvas id="particulatesChartCanvas"></canvas>
      </div>
    </div>
  `;

  document.getElementById('dashHistBtn')?.addEventListener('click', () => {
    dashboardHorizon = 'historical';
    renderDashboardBody();
  });

  document.getElementById('dashBothBtn')?.addEventListener('click', () => {
    dashboardHorizon = 'both';
    renderDashboardBody();
  });

  document.getElementById('dashForeBtn')?.addEventListener('click', () => {
    dashboardHorizon = 'forecast';
    renderDashboardBody();
  });

  document.querySelectorAll('.dash-single-metric').forEach((card) => {
    card.addEventListener('click', () => {
      activeSingleMetric = card.getAttribute('data-metric') || 'pm2_5';
      renderDashboardBody();
    });
  });

  document.querySelectorAll('.dash-compare-metric').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCompareMetric = btn.getAttribute('data-metric') || 'pm2_5';
      renderDashboardBody();
    });
  });

  buildDashboardChart();
}

function buildDashboardChart() {
  const pCanvas = document.getElementById('particulatesChartCanvas') as HTMLCanvasElement;
  if (!pCanvas || !cachedCityPayloads.length) return;

  const baseTimes = cachedCityPayloads[0].hourly?.time;
  if (!baseTimes) return;

  const isMultiCity = cachedCityPayloads.length > 1;
  const metricKey =
    dashboardMode === 'basic'
      ? 'us_aqi'
      : isMultiCity
        ? activeCompareMetric
        : activeSingleMetric;

  const meta = metricKey === 'us_aqi' ? null : POLLUTANTS[metricKey];

  const series: ChartSeriesInput[] = cachedCityPayloads.map((payload, idx) => ({
    label: isMultiCity
      ? `${payload.city.name} (${meta ? meta.shortLabel : 'AQI'})`
      : meta
        ? `${meta.label} (${meta.unit})`
        : 'General AQI',
    data: payload.hourly?.[metricKey] || [],
    cssVar: isMultiCity ? CITY_SERIES_VARS[idx % CITY_SERIES_VARS.length] : meta ? meta.cssVar : '--accent'
  }));

  particulatesChart = buildLineChart(
    pCanvas,
    particulatesChart,
    baseTimes,
    dashboardHorizon,
    series,
    meta ? `${meta.shortLabel} (${meta.unit})` : 'General AQI'
  );
}
