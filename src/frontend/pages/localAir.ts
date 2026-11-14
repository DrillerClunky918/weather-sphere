import Chart from 'chart.js/auto';

let localChartInstance: Chart | null = null;
let currentTimelineData: any = null;
let currentSnapshotData: any = null;
let activeTimelineMetric: string = 'pm2_5';
let activeDisplayMode: 'mean' | 'current' = 'mean';
let activeExperienceMode: 'basic' | 'advanced' = 'basic';
let activeTimeHorizon: 'historical' | 'forecast' = 'historical';
let isEditingLocation: boolean = false;

let activeLocation: {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  isManual: boolean;
} | null = null;

const metricMeta: Record<string, { name: string, unit: string, color: string, good: number, fair: number }> = {
  pm2_5: { name: 'PM 2.5', unit: 'µg/m³', color: '#f38ba8', good: 10, fair: 25 },
  pm10: { name: 'PM 10', unit: 'µg/m³', color: '#74c7ec', good: 20, fair: 50 },
  nitrogen_dioxide: { name: 'Nitrogen Dioxide (NO₂)', unit: 'µg/m³', color: '#f5c2e7', good: 40, fair: 100 },
  ozone: { name: 'Ozone (O₃)', unit: 'µg/m³', color: '#f9e2af', good: 50, fair: 100 },
  sulphur_dioxide: { name: 'Sulfur Dioxide (SO₂)', unit: 'µg/m³', color: '#cba6f7', good: 100, fair: 200 },
  carbon_monoxide: { name: 'Carbon Monoxide (CO)', unit: 'µg/m³', color: '#f2cdcd', good: 5000, fair: 10000 }
};

function getAqiGuidance(aqi: number | null) {
  if (aqi === null || isNaN(aqi)) {
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

export async function renderLocalAir() {
  await loadLocalAirData();
}

async function loadLocalAirData(overrideCity?: string) {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container" style="text-align: center; padding-top: 4rem;">
      <h1 style="color: var(--text-muted); font-size: 1.5rem;">Syncing with atmospheric monitoring streams...</h1>
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
        // Auto-detection blocked or unavailable
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

    const { latitude, longitude, name, country } = geoData.results[0];
    activeLocation = {
      city: name,
      country: country || detectedCountry,
      latitude,
      longitude,
      isManual: Boolean(overrideCity || activeLocation?.isManual)
    };

    const aqRes = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&past_days=5&forecast_days=5`
    );
    const aqData = await aqRes.json();

    currentTimelineData = aqData?.hourly || null;
    currentSnapshotData = aqData?.current || {};
    isEditingLocation = false;

    renderPageLayout();
  } catch (err: any) {
    renderLocationPrompt(err.message || 'Unable to resolve location.');
  }
}

function renderLocationPrompt(notice: string) {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container" style="max-width: 520px; margin: 3rem auto; text-align: center;">
      <div class="aqi-card">
        <h1 style="font-size: 1.75rem; margin: 0 0 0.5rem 0;">Your City's Air Profile</h1>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">${notice}</p>
        <form id="initialCityForm" class="inline-city-form" style="margin-top: 0;">
          <input type="text" id="initialCityInput" placeholder="Enter your city (e.g., London, Paris, Tokyo)..." required />
          <button type="submit" class="btn-primary">Load Air</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('initialCityForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('initialCityInput') as HTMLInputElement;
    if (input?.value.trim()) {
      loadLocalAirData(input.value.trim());
    }
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

  outlet.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>Your City's Air Profile</h1>
        <div class="location-meta-row">
          <p style="color: var(--text-muted); font-size: 0.9rem; margin: 0;">
            ${city}${country ? `, ${country}` : ''} — Coordinates: ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E
            <span class="status-pill" style="margin-left: 0.4rem; background: var(--ctp-surface0); color: var(--accent);">
              ${isManual ? 'Manual Override' : 'Auto-Detected'}
            </span>
          </p>
          <button id="toggleEditCityBtn" class="btn-ghost">
            ${isEditingLocation ? 'Cancel' : 'Change City'}
          </button>
        </div>

        ${isEditingLocation ? `
          <form id="overrideCityForm" class="inline-city-form">
            <input type="text" id="overrideCityInput" placeholder="Enter city (e.g., Reading, Oxford, Paris)..." value="${city}" required />
            <button type="submit" class="btn-primary">Apply</button>
            ${isManual ? `<button type="button" id="resetAutoLocationBtn" class="btn-ghost">Auto</button>` : ''}
          </form>
        ` : ''}
      </div>

      <div class="controls-bar" style="justify-content: center; flex-wrap: wrap;">
        <div class="segmented-toggle">
          <button id="toggleBasicExp" class="segmented-btn ${activeExperienceMode === 'basic' ? 'active' : ''}">Basic Mode</button>
          <button id="toggleAdvancedExp" class="segmented-btn ${activeExperienceMode === 'advanced' ? 'active' : ''}">Advanced Mode</button>
        </div>

        <div class="segmented-toggle">
          <button id="toggleMeanMode" class="segmented-btn ${activeDisplayMode === 'mean' ? 'active' : ''}">Past 24h Average</button>
          <button id="toggleCurrentMode" class="segmented-btn ${activeDisplayMode === 'current' ? 'active' : ''}">Current Reading</button>
        </div>
      </div>

      ${activeExperienceMode === 'basic' ? renderBasicViewHtml() : renderAdvancedViewHtml()}

      <div class="timeline-panel">
        <div class="timeline-panel-header">
          <div>
            <h4 style="margin: 0; font-size: 1rem;">
              ${activeExperienceMode === 'basic' ? 'General AQI Trend' : `${metricMeta[activeTimelineMetric].name} Trend`}
            </h4>
            <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: var(--text-muted);">
              Switch between past observations and upcoming atmospheric projections.
            </p>
          </div>
          <div class="segmented-toggle">
            <button id="toggleHistoricalBtn" class="segmented-btn ${activeTimeHorizon === 'historical' ? 'active' : ''}">Historical (Past 5d)</button>
            <button id="toggleForecastBtn" class="segmented-btn ${activeTimeHorizon === 'forecast' ? 'active' : ''}">Forecast (Next 5d)</button>
          </div>
        </div>

        <div class="chart-wrapper" style="height: 320px;">
          <canvas id="localTimelineCanvas"></canvas>
        </div>
      </div>
    </div>
  `;

  if (activeExperienceMode === 'advanced') {
    updateInterpretationBox();
  }
  buildTimelineChart();
  setupPageListeners();
}

function renderBasicViewHtml(): string {
  const aqiVal = getComputedMetricValue('us_aqi');
  const guidance = getAqiGuidance(aqiVal);
  const windowLabel = activeDisplayMode === 'mean' ? 'Past 24h Average AQI' : 'Current General AQI';

  return `
    <div class="aqi-hero-grid">
      <div class="aqi-card" style="border-top: 4px solid ${guidance.color};">
        <div>
          <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">${windowLabel}</span>
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
            The <strong>Air Quality Index (AQI)</strong> combines major pollutants—including fine particles, ozone, and traffic gases—into a single 0–500 health score so you can judge air safety at a glance.
          </p>
        </div>
        <div style="border-top: 1px solid var(--border-muted); padding-top: 0.85rem;">
          <h3 style="margin: 0 0 0.3rem 0; font-size: 0.85rem; text-transform: uppercase; color: ${guidance.color};">Plain-Language Interpretation</h3>
          <p style="margin: 0; font-size: 0.92rem; color: var(--text-main);">${guidance.summary}</p>
        </div>
      </div>
    </div>
  `;
}

function renderAdvancedViewHtml(): string {
  const cardsHtml = Object.entries(metricMeta).map(([key, meta]) => {
    const targetValue = getComputedMetricValue(key);
    const labelText = activeDisplayMode === 'mean' ? 'Past 24h Mean' : 'Instant Current';
    const status = getStatusLabel(key, targetValue);

    return `
      <div class="info-card metric-selector-btn ${activeTimelineMetric === key ? 'active-card' : ''}" data-metric="${key}" style="border-top: 4px solid ${meta.color};">
        <h3 style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">${meta.name}</h3>
        <div style="font-size: 0.7rem; color: var(--accent); font-weight: 500; margin-bottom: 0.5rem;">${labelText}</div>
        <div style="font-size: 1.4rem; font-weight: 800; color: white;">
          ${targetValue !== null ? `${targetValue} <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${meta.unit}</span>` : '--'}
        </div>
        <div class="status-pill" style="margin-top: 0.5rem; background: ${status.bg}; color: ${status.color};">${status.text}</div>
      </div>
    `;
  }).join('');

  return `
    <div id="metricGridWrapper" class="info-grid" style="margin-bottom: 1.25rem;">${cardsHtml}</div>
    <div id="interpretationBox" class="guidance-banner"></div>
  `;
}

function getStatusLabel(key: string, val: number | null) {
  if (val === null) return { text: 'Unavailable', color: 'var(--text-muted)', bg: 'var(--ctp-surface1)' };
  const meta = metricMeta[key];
  if (val <= meta.good) return { text: 'Good', color: 'var(--ctp-green)', bg: 'rgba(166, 227, 161, 0.1)' };
  if (val <= meta.fair) return { text: 'Fair', color: 'var(--ctp-yellow)', bg: 'rgba(249, 226, 175, 0.1)' };
  return { text: 'Poor', color: 'var(--ctp-red)', bg: 'rgba(243, 139, 168, 0.1)' };
}

function updateInterpretationBox() {
  const box = document.getElementById('interpretationBox');
  if (!box) return;

  const meta = metricMeta[activeTimelineMetric];
  const guides: Record<string, string> = {
    pm2_5: 'Microscopic particulate fragments capable of penetrating deep into lungs. High fractions suggest active smoke, vehicular tailpipe exhaust, dust storms, or localized industrial smog.',
    pm10: 'Inhalable coarse particles from road dust, construction, and industrial emissions. Elevated levels can irritate airways and eyes.',
    nitrogen_dioxide: 'Heavily linked to combustion processes and fossil-fuel burning vehicles. Elevated scales typically indicate dense traffic congestion or low wind dispersion.',
    ozone: 'Surface-level gas generated when sunlight reacts with nitrogen oxides and volatile chemicals. Tends to peak during hot, stagnant afternoon windows.',
    sulphur_dioxide: 'A pungent gas produced predominantly by industrial processes and power plants burning high-sulfur fuels. Can irritate bronchial pathways.',
    carbon_monoxide: 'An odorless gas emerging from incomplete carbon combustion. Elevated levels outdoors generally occur near dense idling traffic.'
  };

  box.style.borderLeftColor = meta.color;
  box.innerHTML = `
    <h4 style="margin: 0 0 0.25rem 0; color: ${meta.color}; font-size: 0.95rem;">
      ${meta.name} Guide (Click any pollutant card above to inspect its timeline)
    </h4>
    <p style="margin: 0; font-size: 0.85rem; color: var(--text-main);">${guides[activeTimelineMetric] || ''}</p>
  `;
}

function buildTimelineChart() {
  const ctx = document.getElementById('localTimelineCanvas') as HTMLCanvasElement;
  if (!ctx) return;

  if (localChartInstance) {
    localChartInstance.destroy();
    localChartInstance = null;
  }

  const metricKey = activeExperienceMode === 'basic' ? 'us_aqi' : activeTimelineMetric;
  const chartLabel = activeExperienceMode === 'basic' ? 'General AQI' : metricMeta[metricKey].name;
  const chartUnit = activeExperienceMode === 'basic' ? 'AQI' : metricMeta[metricKey].unit;
  const chartColor = activeExperienceMode === 'basic' ? '#89b4fa' : metricMeta[metricKey].color;

  if (!currentTimelineData?.time || !currentTimelineData[metricKey]) return;

  const now = Date.now();
  const filteredIndices: number[] = [];
  currentTimelineData.time.forEach((tStr: string, idx: number) => {
    const ts = new Date(tStr).getTime();
    if (activeTimeHorizon === 'historical' && ts <= now) filteredIndices.push(idx);
    if (activeTimeHorizon === 'forecast' && ts > now) filteredIndices.push(idx);
  });

  const formattedLabels = filteredIndices.map((idx) => {
    const d = new Date(currentTimelineData.time[idx]);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  });

  const rawDatasetValues = filteredIndices.map((idx) => currentTimelineData[metricKey][idx]);

  localChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: formattedLabels,
      datasets: [{
        label: chartLabel,
        data: rawDatasetValues,
        borderColor: chartColor,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 20,
        tension: 0.25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#11111b',
          titleColor: '#cdd6f4',
          bodyColor: '#cdd6f4',
          borderColor: '#45475a',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.raw} ${chartUnit}`
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#6c7086', maxTicksLimit: 6, font: { family: 'Inter', size: 11 } } },
        y: {
          grid: { color: '#313244' },
          ticks: {
            color: '#6c7086',
            font: { family: 'Inter', size: 11 },
            callback: (value) => `${value} ${chartUnit}`
          }
        }
      }
    }
  });
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

  document.getElementById('toggleForecastBtn')?.addEventListener('click', () => {
    if (activeTimeHorizon !== 'forecast') {
      activeTimeHorizon = 'forecast';
      renderPageLayout();
    }
  });

  document.querySelectorAll('.metric-selector-btn').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.metric-selector-btn').forEach(c => c.classList.remove('active-card'));
      card.classList.add('active-card');
      activeTimelineMetric = card.getAttribute('data-metric') || 'pm2_5';
      updateInterpretationBox();
      buildTimelineChart();
    });
  });
}
