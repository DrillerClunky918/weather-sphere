import Chart from 'chart.js/auto';

let localChartInstance: Chart | null = null;
let currentTimelineData: any = null;
let currentSnapshotData: any = null;
let activeTimelineMetric: string = 'pm2_5';
let activeDisplayMode: 'mean' | 'current' = 'mean';

const metricMeta: Record<string, { name: string, unit: string, color: string, good: number, fair: number }> = {
  pm2_5: { name: 'PM 2.5', unit: 'µg/m³', color: '#f38ba8', good: 10, fair: 25 },
  pm10: { name: 'PM 10', unit: 'µg/m³', color: '#74c7ec', good: 20, fair: 50 },
  nitrogen_dioxide: { name: 'Nitrogen Dioxide (NO₂)', unit: 'µg/m³', color: '#f5c2e7', good: 40, fair: 100 },
  ozone: { name: 'Ozone (O₃)', unit: 'µg/m³', color: '#f9e2af', good: 50, fair: 100 },
  sulphur_dioxide: { name: 'Sulfur Dioxide (SO₂)', unit: 'µg/m³', color: '#cba6f7', good: 100, fair: 200 },
  carbon_monoxide: { name: 'Carbon Monoxide (CO)', unit: 'µg/m³', color: '#f2cdcd', good: 5000, fair: 10000 }
};

export async function renderLocalAir() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container" style="text-align: center; padding-top: 4rem;">
      <h1 style="color: var(--text-muted); font-size: 1.5rem;">Syncing with atmospheric monitoring streams...</h1>
    </div>
  `;

  let city = 'Singapore';
  let country = 'Singapore';

  try {
    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.city) city = ipData.city;
        if (ipData.country_name) country = ipData.country_name;
      }
    } catch (e) {
      console.warn("IP tracking API blocked by browser privacy rules. Using default dashboard anchor node.");
    }

    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();
    if (!geoData.results?.length) throw new Error(`Could not verify geographic coordinates for ${city}.`);
    const { latitude, longitude } = geoData.results[0];

    const aqRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone`);
    const aqData = await aqRes.json();

    currentTimelineData = aqData?.hourly || null;
    currentSnapshotData = aqData?.current || {};

    renderPageLayout(city, country, latitude, longitude);

  } catch (err: any) {
    outlet.innerHTML = `
      <div class="container" style="text-align: center; padding-top: 4rem;">
        <h2 style="color: var(--error-color); font-size: 1.5rem;">Client Link Standby Error</h2>
        <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 0.9rem;">${err.message}</p>
      </div>
    `;
  }
}

function renderPageLayout(city: string, country: string, latitude: number, longitude: number) {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container">
      <div class="header" style="margin-bottom: 1.5rem;">
        <h1 style="font-size: 2rem;">Your City's Air Profile</h1>
        <p style="color: var(--text-muted); font-size: 0.9rem;">${city}, ${country} — Coordinates: ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E</p>
      </div>

      <div class="controls-bar" style="margin-bottom: 1.5rem; display: flex; justify-content: center; background: var(--ctp-mantle);">
        <div style="display: flex; background: var(--ctp-surface0); padding: 4px; border-radius: 8px; border: 1px solid var(--border-muted);">
          <button id="toggleMeanMode" class="btn-primary" style="background: ${activeDisplayMode === 'mean' ? 'var(--accent)' : 'transparent'}; color: ${activeDisplayMode === 'mean' ? 'var(--btn-text)' : 'var(--text-muted)'}; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; box-shadow: none; transform: none;">
            Past 24h Average
          </button>
          <button id="toggleCurrentMode" class="btn-primary" style="background: ${activeDisplayMode === 'current' ? 'var(--accent)' : 'transparent'}; color: ${activeDisplayMode === 'current' ? 'var(--btn-text)' : 'var(--text-muted)'}; padding: 6px 16px; border-radius: 6px; font-size: 0.85rem; box-shadow: none; transform: none; margin-left: 4px;">
            Current Reading
          </button>
        </div>
      </div>

      <div id="metricGridWrapper" class="info-grid" style="margin-bottom: 1.5rem;">
        ${renderMetricCardsHtml()}
      </div>

      <div id="interpretationBox" style="background: var(--ctp-surface0); border: 1px solid var(--border-muted); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; font-size: 0.9rem;"></div>

      <div class="chart-wrapper" style="height: 350px;">
        <canvas id="localTimelineCanvas"></canvas>
      </div>
    </div>
  `;

  updateInterpretationBox();
  buildTimelineChart();
  setupToggleListeners(city, country, latitude, longitude);
}

function renderMetricCardsHtml(): string {
  return Object.entries(metricMeta).map(([key, meta]) => {
    let targetValue: number | null = null;
    let labelText = '';

    if (activeDisplayMode === 'mean') {
      const dataset = currentTimelineData?.[key] || [];
      const past24HoursData = dataset.slice(0, 24).filter((v: any) => v !== null && v !== undefined);
      targetValue = past24HoursData.length > 0 
        ? parseFloat((past24HoursData.reduce((sum: number, v: number) => sum + v, 0) / past24HoursData.length).toFixed(1))
        : null;
      labelText = 'Past 24h Mean';
    } else {
      const rawVal = currentSnapshotData?.[key];
      targetValue = (rawVal !== undefined && rawVal !== null) ? parseFloat(rawVal.toFixed(1)) : null;
      labelText = 'Instant Current';
    }

    const status = getStatusLabel(key, targetValue);
    return `
      <div class="info-card metric-selector-btn ${activeTimelineMetric === key ? 'active-card' : ''}" data-metric="${key}" style="border-top: 4px solid ${meta.color}; cursor: pointer;">
        <h3 style="color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.25rem 0;">${meta.name}</h3>
        <div style="font-size: 0.7rem; color: var(--accent); font-weight: 500; margin-bottom: 0.5rem;">${labelText}</div>
        <div style="font-size: 1.4rem; font-weight: 800; color: white;">
          ${targetValue !== null ? `${targetValue} <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${meta.unit}</span>` : '--'}
        </div>
        <div style="margin-top: 0.5rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; display: inline-block; padding: 2px 6px; border-radius: 4px; background: ${status.bg}; color: ${status.color};">
          ${status.text}
        </div>
      </div>
    `;
  }).join('');
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
  let guideText = '';

  switch(activeTimelineMetric) {
    case 'pm2_5':
    case 'pm10':
      guideText = 'Microscopic particulate fragments capable of penetrating deep into lungs. High fractions suggest active smoke, vehicular tailpipe exhaust, dust storms, or localized industrial smog concentration spikes.';
      break;
    case 'nitrogen_dioxide':
      guideText = 'Heavily linked to combustion processes and fossil-fuel burning vehicles. Elevated scales typically indicate dense highway grids, traffic congestion patterns, or low atmospheric cross-wind dispersion.';
      break;
    case 'ozone':
      guideText = 'Surface-level gas generated dynamically when sunlight cooks nitrogen oxides and volatile chemicals. Tends to peak during hot, stagnant afternoon windows.';
      break;
    case 'sulphur_dioxide':
      guideText = 'A pungent gas produced predominantly by industrial processes and power generation facilities burning high-sulfur fuel structures. Can irritate bronchial pathways even during brief exposures.';
      break;
    case 'carbon_monoxide':
      guideText = 'An odorless gas emerging from incomplete carbon combustion. Elevated levels are rare outdoors except in heavily packed subterranean tunnels or direct proximity to dense idling traffic fields.';
      break;
  }

  box.innerHTML = `
    <h4 style="margin: 0 0 0.25rem 0; color: ${meta.color}; font-size: 0.95rem; font-weight: 700;">
      ${meta.name} Timeline
    </h4>
    <p style="margin: 0; font-size: 0.85rem; color: var(--text-main); line-height: 1.5;">${guideText}</p>
  `;
}

function buildTimelineChart() {
  const ctx = document.getElementById('localTimelineCanvas') as HTMLCanvasElement;
  if (!ctx) return;

  if (localChartInstance) {
    localChartInstance.destroy();
    localChartInstance = null;
  }

  const meta = metricMeta[activeTimelineMetric];

  if (!currentTimelineData || !currentTimelineData.time || !currentTimelineData[activeTimelineMetric]) {
    const textPlugin = {
      id: 'customText',
      afterDraw: (chart: any) => {
        const { ctx, width, height } = chart;
        ctx.save();
        ctx.font = '14px Inter, sans-serif';
        ctx.fillStyle = '#6c7086';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Historical timeline tracking data unavailable for this metric node context.', width / 2, height / 2);
        ctx.restore();
      }
    };

    localChartInstance = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: { responsive: true, maintainAspectRatio: false },
      plugins: [textPlugin]
    });
    return;
  }
  
  const formattedLabels = currentTimelineData.time.map((tStr: string) => {
    const d = new Date(tStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ` + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  });

  const rawDatasetValues = currentTimelineData[activeTimelineMetric];

  localChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: formattedLabels,
      datasets: [{
        label: `${meta.name}`,
        data: rawDatasetValues,
        borderColor: meta.color,
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
      interaction: {
        mode: 'index',
        intersect: false
      },
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
            label: function(context) {
              return `${context.dataset.label}: ${context.raw} ${meta.unit}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#6c7086', maxTicksLimit: 6, font: { family: 'Inter', size: 11 } }
        },
        y: {
          grid: { color: '#313244' },
          ticks: { 
            color: '#6c7086',
            font: { family: 'Inter', size: 11 },
            callback: function(value) { return value + ' ' + meta.unit; }
          }
        }
      }
    }
  });
}

function setupToggleListeners(city: string, country: string, latitude: number, longitude: number) {
  const btnMean = document.getElementById('toggleMeanMode');
  const btnCurrent = document.getElementById('toggleCurrentMode');
  const gridWrapper = document.getElementById('metricGridWrapper');

  if (!btnMean || !btnCurrent || !gridWrapper) return;

  btnMean.onclick = () => {
    if (activeDisplayMode === 'mean') return;
    activeDisplayMode = 'mean';
    renderPageLayout(city, country, latitude, longitude);
  };

  btnCurrent.onclick = () => {
    if (activeDisplayMode === 'current') return;
    activeDisplayMode = 'current';
    renderPageLayout(city, country, latitude, longitude);
  };
}

// Global Event Delegation context observer loop remains active across tab switches
window.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const card = target.closest('.metric-selector-btn') as HTMLElement;
  if (!card) return;

  document.querySelectorAll('.metric-selector-btn').forEach(c => c.classList.remove('active-card'));
  card.classList.add('active-card');
  
  activeTimelineMetric = card.getAttribute('data-metric') || 'pm2_5';
  updateInterpretationBox();
  buildTimelineChart();
});