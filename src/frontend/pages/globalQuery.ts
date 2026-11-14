import Chart from 'chart.js/auto';

let searchMode: 'basic' | 'advanced' = 'basic';
let searchHorizon: 'historical' | 'forecast' = 'historical';
let lastSearchPayload: any = null;
let searchChartInstance: Chart | null = null;

const pollutantConfig = [
  { key: 'pm2_5', label: 'PM 2.5', unit: 'µg/m³', color: '#f38ba8', good: 10, fair: 25 },
  { key: 'pm10', label: 'PM 10', unit: 'µg/m³', color: '#74c7ec', good: 20, fair: 50 },
  { key: 'nitrogen_dioxide', label: 'Nitrogen Dioxide (NO₂)', unit: 'µg/m³', color: '#f5c2e7', good: 40, fair: 100 },
  { key: 'ozone', label: 'Ozone (O₃)', unit: 'µg/m³', color: '#f9e2af', good: 50, fair: 100 },
  { key: 'sulphur_dioxide', label: 'Sulfur Dioxide (SO₂)', unit: 'µg/m³', color: '#cba6f7', good: 100, fair: 200 },
  { key: 'carbon_monoxide', label: 'Carbon Monoxide (CO)', unit: 'µg/m³', color: '#f2cdcd', good: 5000, fair: 10000 }
];

function getAqiSummary(aqi: number | null) {
  if (aqi === null || isNaN(aqi)) {
    return { text: 'Unavailable', color: 'var(--text-muted)', description: 'General AQI data is unavailable for this location.' };
  }
  if (aqi <= 50) {
    return {
      text: 'Good',
      color: '#4ade80',
      description: 'Air quality is clean and within safe health guidelines. Ideal for outdoor activities.'
    };
  }
  if (aqi <= 100) {
    return {
      text: 'Fair / Moderate',
      color: '#fbbf24',
      description: 'Air quality is acceptable, though unusually sensitive individuals should monitor prolonged outdoor exertion.'
    };
  }
  if (aqi <= 150) {
    return {
      text: 'Sensitive Risk',
      color: '#fb923c',
      description: 'Elevated pollution levels. Children, older adults, and people with respiratory conditions should limit outdoor exposure.'
    };
  }
  return {
    text: 'Poor',
    color: '#f87171',
    description: 'High pollution levels detected. Mask usage or reducing prolonged outdoor exposure is advised.'
  };
}

export function renderGlobalQuery() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container">
      <div class="header" style="text-align: center;">
        <h1>Live Search</h1>
        <p style="color: var(--text-muted);">Search for any city worldwide to check its General AQI, historical trends, and pollutant breakdown.</p>
      </div>

      <div class="dashboard-section" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; border: 1px solid var(--border-muted); max-width: 780px; margin: 0 auto;">
        <form id="auditForm" style="display: flex; gap: 1rem; margin-bottom: 1.5rem;">
          <input
            type="text"
            id="cityInput"
            placeholder="Enter a target city (e.g. Paris, Reading, Tokyo)..."
            style="flex: 1; padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-muted); background: var(--bg-input); color: var(--text-main);"
            required
          />
          <button type="submit" id="auditBtn" class="btn-primary" style="padding: 0.75rem 1.5rem;">Search Location</button>
        </form>

        <div id="auditOutput"></div>
      </div>
    </div>
  `;

  const form = document.getElementById('auditForm');
  form?.addEventListener('submit', handleAuditSubmit);
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
  output.innerHTML = `<p style="color: var(--text-muted); text-align: center;">Resolving target geospatial points...</p>`;

  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`
    );
    if (!geoRes.ok) throw new Error('Geocoding service unavailable.');
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error('Target location could not be verified by geocoder.');
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const aqRes = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm2_5&past_days=5&forecast_days=5`
    );
    if (!aqRes.ok) throw new Error('Air quality service unavailable.');
    const aqData = await aqRes.json();

    if (!aqData.current) {
      throw new Error('Target station returned empty atmospheric response fields.');
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
    output.innerHTML = `<p style="color: var(--error-color); text-align: center; font-weight: bold; margin-top: 1rem;">${err.message}</p>`;
  } finally {
    button.disabled = false;
    button.innerText = 'Search Location';
  }
}

function renderSearchResult() {
  const output = document.getElementById('auditOutput');
  if (!output || !lastSearchPayload) return;

  const { name, country, latitude, longitude, current } = lastSearchPayload;
  const aqi = current.us_aqi ?? null;
  const aqiInfo = getAqiSummary(aqi);
  const pm25 = current.pm2_5;
  const pm10 = current.pm10;
  const dataFailedIntegrity = pm25 !== null && pm10 !== null && pm25 > pm10;

  const alertMarkup = dataFailedIntegrity ? `
    <div style="background: rgba(239, 68, 68, 0.1); color: var(--error-color); padding: 0.75rem; border-radius: 6px; font-size: 0.85rem; font-weight: bold; text-align: center; border: 1px solid var(--error-color); margin-top: 1.25rem;">
      ⚠ Anomaly Detected: PM 2.5 (${pm25} µg/m³) exceeds PM 10 (${pm10} µg/m³). Sensor reporting integrity may be skewed.
    </div>
  ` : '';

  const basicSectionHtml = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 1.25rem;">
      <div style="background: var(--bg-input); padding: 1.25rem; border-radius: 8px; border-left: 4px solid ${aqiInfo.color};">
        <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">General AQI</div>
        <div style="display: flex; align-items: baseline; gap: 0.75rem; margin-top: 0.5rem;">
          <span style="font-size: 2.5rem; font-weight: 800; color: var(--text-main);">${aqi !== null ? aqi : '--'}</span>
          <strong style="font-size: 0.9rem; color: ${aqiInfo.color}; text-transform: uppercase; letter-spacing: 0.04em;">${aqiInfo.text}</strong>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
          0–50 Good • 51–100 Fair • 101–150 Sensitive • 151+ Poor
        </div>
      </div>

      <div style="background: var(--bg-input); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-muted);">
        <div style="font-size: 0.8rem; text-transform: uppercase; color: var(--accent); font-weight: 600; margin-bottom: 0.35rem;">
          What is General AQI?
        </div>
        <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted); line-height: 1.45;">
          Air Quality Index (AQI) translates raw pollutant levels into a single 0–500 health rating. Lower numbers mean cleaner air.
        </p>
      </div>
    </div>

    <div style="padding: 1.15rem; background: var(--bg-input); border-radius: 8px; border: 1px solid var(--border-muted); text-align: left;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
        <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Plain-Language Interpretation:</span>
        <strong style="font-size: 0.9rem; color: ${aqiInfo.color}; text-transform: uppercase;">${aqiInfo.text}</strong>
      </div>
      <p style="margin: 0; font-size: 0.92rem; color: var(--text-main); line-height: 1.5;">
        ${aqiInfo.description}
      </p>
    </div>
  `;

  const advancedPollutantCards = pollutantConfig.map((p) => {
    const val = current[p.key];
    const displayVal = val !== undefined && val !== null ? val.toFixed(1) : '--';
    let badge = { text: 'Good', color: '#4ade80' };
    if (val > p.fair) badge = { text: 'Poor', color: '#f87171' };
    else if (val > p.good) badge = { text: 'Fair', color: '#fbbf24' };

    return `
      <div style="background: var(--bg-input); padding: 0.9rem; border-radius: 6px; border-left: 4px solid ${p.color};">
        <div style="font-size: 0.78rem; color: var(--text-muted);">${p.label}</div>
        <div style="font-size: 1.35rem; font-weight: 700; color: var(--text-main); margin: 0.25rem 0;">
          ${displayVal} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 400;">${p.unit}</span>
        </div>
        <span style="font-size: 0.72rem; font-weight: 700; color: ${badge.color}; text-transform: uppercase;">${badge.text}</span>
      </div>
    `;
  }).join('');

  const advancedSectionHtml = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.9rem; margin-bottom: 1.25rem;">
      ${advancedPollutantCards}
    </div>

    <div style="background: var(--bg-input); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-muted);">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">AQI Historical & Forecast Trend</span>
        <div style="display: flex; background: var(--bg-card); padding: 3px; border-radius: 6px; border: 1px solid var(--border-muted);">
          <button id="searchHistBtn" style="background: ${searchHorizon === 'historical' ? 'var(--accent)' : 'transparent'}; color: ${searchHorizon === 'historical' ? 'var(--btn-text)' : 'var(--text-muted)'}; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer;">
            Historical (Past 5d)
          </button>
          <button id="searchForeBtn" style="background: ${searchHorizon === 'forecast' ? 'var(--accent)' : 'transparent'}; color: ${searchHorizon === 'forecast' ? 'var(--btn-text)' : 'var(--text-muted)'}; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-left: 3px;">
            Forecast (Next 5d)
          </button>
        </div>
      </div>
      <div style="height: 210px;">
        <canvas id="searchTimelineCanvas"></canvas>
      </div>
    </div>
    ${alertMarkup}
  `;

  output.innerHTML = `
    <div style="border-top: 1px solid var(--border-muted); padding-top: 1.5rem; margin-top: 0.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.25rem;">
        <div>
          <h3 style="color: var(--text-main); margin: 0 0 0.25rem 0;">Live Open-Meteo Report: ${name} (${country})</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Coordinates: ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E</p>
        </div>

        <div style="display: flex; background: var(--bg-input); padding: 4px; border-radius: 8px; border: 1px solid var(--border-muted);">
          <button id="searchBasicBtn" style="background: ${searchMode === 'basic' ? 'var(--accent)' : 'transparent'}; color: ${searchMode === 'basic' ? 'var(--btn-text)' : 'var(--text-muted)'}; border: none; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">
            Basic Mode
          </button>
          <button id="searchAdvBtn" style="background: ${searchMode === 'advanced' ? 'var(--accent)' : 'transparent'}; color: ${searchMode === 'advanced' ? 'var(--btn-text)' : 'var(--text-muted)'}; border: none; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; margin-left: 4px;">
            Advanced Mode
          </button>
        </div>
      </div>

      ${searchMode === 'basic' ? basicSectionHtml : advancedSectionHtml}
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

  if (searchMode === 'advanced') {
    document.getElementById('searchHistBtn')?.addEventListener('click', () => {
      searchHorizon = 'historical';
      renderSearchResult();
    });
    document.getElementById('searchForeBtn')?.addEventListener('click', () => {
      searchHorizon = 'forecast';
      renderSearchResult();
    });
    renderSearchChart();
  }
}

function renderSearchChart() {
  const ctx = document.getElementById('searchTimelineCanvas') as HTMLCanvasElement;
  if (!ctx || !lastSearchPayload?.hourly) return;

  if (searchChartInstance) {
    searchChartInstance.destroy();
    searchChartInstance = null;
  }

  const hourly = lastSearchPayload.hourly;
  const now = Date.now();
  const indices: number[] = [];

  hourly.time.forEach((tStr: string, idx: number) => {
    const ts = new Date(tStr).getTime();
    if (searchHorizon === 'historical' && ts <= now) indices.push(idx);
    if (searchHorizon === 'forecast' && ts > now) indices.push(idx);
  });

  const labels = indices.map((idx) => {
    const d = new Date(hourly.time[idx]);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: 'numeric' });
  });
  const values = indices.map((idx) => hourly.us_aqi[idx]);

  searchChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'General AQI',
        data: values,
        borderColor: '#89b4fa',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#6c7086', maxTicksLimit: 5, font: { size: 10 } } },
        y: { grid: { color: '#313244' }, ticks: { color: '#6c7086', font: { size: 10 } } }
      }
    }
  });
}
