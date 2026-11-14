import Chart from 'chart.js/auto';

export const API_BASE = '';

export interface CityStation {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export const STATIC_CITIES: CityStation[] = [
  { id: '1', name: 'New York City', state: 'NY', lat: 40.71, lon: -74.01 },
  { id: '2', name: 'London', state: 'ENG', lat: 51.51, lon: -0.13 },
  { id: '3', name: 'Tokyo', state: 'TYO', lat: 35.68, lon: 139.69 },
  { id: '4', name: 'Singapore', state: 'SG', lat: 1.35, lon: 103.82 },
  { id: '5', name: 'Paris', state: 'IDF', lat: 48.86, lon: 2.35 },
  { id: '6', name: 'Sydney', state: 'NSW', lat: -33.87, lon: 151.21 },
  { id: '7', name: 'Mumbai', state: 'MH', lat: 19.07, lon: 72.88 },
  { id: '8', name: 'Cairo', state: 'CRA', lat: 30.04, lon: 31.24 },
  { id: '9', name: 'São Paulo', state: 'SP', lat: -23.55, lon: -46.63 },
  { id: '10', name: 'Cape Town', state: 'WC', lat: -33.93, lon: 18.42 }
];

export interface PollutantInfo {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
  cssVar: string;
  good: number;
  fair: number;
  yAxisID: 'y' | 'y1';
  guide: string;
}

export const POLLUTANTS: Record<string, PollutantInfo> = {
  pm2_5: {
    key: 'pm2_5',
    label: 'PM 2.5',
    shortLabel: 'PM 2.5',
    unit: 'µg/m³',
    cssVar: '--pm25-color',
    good: 10,
    fair: 25,
    yAxisID: 'y',
    guide: 'Fine inhalable particles from vehicle exhaust, smoke, and industrial emissions that can reach deep into the lungs.'
  },
  pm10: {
    key: 'pm10',
    label: 'PM 10',
    shortLabel: 'PM 10',
    unit: 'µg/m³',
    cssVar: '--pm10-color',
    good: 20,
    fair: 50,
    yAxisID: 'y',
    guide: 'Coarse airborne particles from road dust, construction, and pollen that can irritate eyes and airways.'
  },
  nitrogen_dioxide: {
    key: 'nitrogen_dioxide',
    label: 'Nitrogen Dioxide (NO₂)',
    shortLabel: 'NO₂',
    unit: 'µg/m³',
    cssVar: '--no2-color',
    good: 40,
    fair: 100,
    yAxisID: 'y',
    guide: 'Traffic and fuel-combustion gas that typically spikes near busy highways or during low-wind conditions.'
  },
  ozone: {
    key: 'ozone',
    label: 'Ozone (O₃)',
    shortLabel: 'O₃',
    unit: 'µg/m³',
    cssVar: '--ozone-color',
    good: 50,
    fair: 100,
    yAxisID: 'y',
    guide: 'Ground-level gas formed when sunlight reacts with vehicle and industrial pollutants, usually peaking on warm afternoons.'
  },
  sulphur_dioxide: {
    key: 'sulphur_dioxide',
    label: 'Sulfur Dioxide (SO₂)',
    shortLabel: 'SO₂',
    unit: 'µg/m³',
    cssVar: '--so2-color',
    good: 100,
    fair: 200,
    yAxisID: 'y',
    guide: 'Gas released by power plants and industrial facilities burning sulfur-containing fuels; can irritate airways.'
  },
  carbon_monoxide: {
    key: 'carbon_monoxide',
    label: 'Carbon Monoxide (CO)',
    shortLabel: 'CO',
    unit: 'µg/m³',
    cssVar: '--co-color',
    good: 5000,
    fair: 10000,
    yAxisID: 'y1',
    guide: 'Colorless gas produced by incomplete fuel combustion, generally elevated near heavy idling traffic.'
  }
};

export const POLLUTANT_LIST: PollutantInfo[] = Object.values(POLLUTANTS);

export function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function getAqiGuidance(aqi: number | null | undefined) {
  if (aqi === null || aqi === undefined || isNaN(aqi)) {
    return {
      label: 'Unavailable',
      tier: 'muted',
      summary: 'Air Quality Index data is currently unavailable for this station.'
    };
  }
  if (aqi <= 50) {
    return {
      label: 'Good',
      tier: 'good',
      summary: 'Air is clean with minimal health risk. Safe for all outdoor activities.'
    };
  }
  if (aqi <= 100) {
    return {
      label: 'Fair',
      tier: 'fair',
      summary: 'Air quality is acceptable for most people; unusually sensitive individuals may notice mild irritation.'
    };
  }
  if (aqi <= 150) {
    return {
      label: 'Sensitive Risk',
      tier: 'sensitive',
      summary: 'Children, older adults, and people with asthma should limit prolonged outdoor exertion.'
    };
  }
  return {
    label: 'Poor',
    tier: 'poor',
    summary: 'High pollution levels. Limit heavy outdoor activity and consider wearing a mask.'
  };
}

export function getPollutantStatus(key: string, val: number | null | undefined) {
  if (val === null || val === undefined || isNaN(val)) {
    return { label: 'Unavailable', tier: 'muted' };
  }
  const meta = POLLUTANTS[key];
  if (!meta) return { label: 'Unknown', tier: 'muted' };
  if (val <= meta.good) return { label: 'Good', tier: 'good' };
  if (val <= meta.fair) return { label: 'Fair', tier: 'fair' };
  return { label: 'Poor', tier: 'poor' };
}

export function renderBasicAqiCards(aqiVal: number | null | undefined, headingLabel: string): string {
  const guidance = getAqiGuidance(aqiVal);
  const displayScore = aqiVal !== null && aqiVal !== undefined && !isNaN(aqiVal) ? Math.round(aqiVal) : '--';

  return `
    <div class="aqi-hero-grid">
      <div class="aqi-card border-top-${guidance.tier}">
        <div>
          <span class="card-kicker text-muted">${headingLabel}</span>
          <div class="aqi-score-row">
            <span class="aqi-score-number">${displayScore}</span>
            <span class="status-pill status-${guidance.tier}">${guidance.label}</span>
          </div>
        </div>
        <p class="subtitle">0–50 Good • 51–100 Fair • 101–150 Sensitive Risk • 151+ Poor</p>
      </div>

      <div class="aqi-card">
        <div>
          <h3 class="card-kicker">What is General AQI?</h3>
          <p class="subtitle">
            The <strong>Air Quality Index (AQI)</strong> combines major pollutants—such as fine particles, ozone, and traffic gases—into a single 0–500 health score.
          </p>
        </div>
        <div class="card-divider">
          <h3 class="card-kicker text-${guidance.tier}">Simplified Interpretation</h3>
          <p class="subtitle">${guidance.summary}</p>
        </div>
      </div>
    </div>
  `;
}

export interface ChartSeriesInput {
  label: string;
  data: (number | null)[];
  cssVar: string;
  yAxisID?: 'y' | 'y1';
}

export function buildLineChart(
  canvas: HTMLCanvasElement,
  existingChart: Chart | null,
  timestamps: string[],
  horizon: 'historical' | 'forecast',
  seriesList: ChartSeriesInput[],
  yAxisTitle: string
): Chart | null {
  if (existingChart) {
    existingChart.destroy();
  }

  const now = Date.now();
  const indices: number[] = [];
  timestamps.forEach((tStr, idx) => {
    const ts = new Date(tStr).getTime();
    if (horizon === 'historical' && ts <= now) indices.push(idx);
    if (horizon === 'forecast' && ts > now) indices.push(idx);
  });

  const labels = indices.map((idx) => {
    const d = new Date(timestamps[idx]);
    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  });

  const hasSecondary = seriesList.some((s) => s.yAxisID === 'y1') && seriesList.length > 1;
  const textMain = getCssVar('--text-main');
  const textMuted = getCssVar('--text-muted');
  const borderMuted = getCssVar('--border-muted');
  const bgCard = getCssVar('--bg-card');

  const datasets = seriesList.map((s) => {
    const color = getCssVar(s.cssVar) || getCssVar('--accent');
    return {
      label: s.label,
      data: indices.map((idx) => s.data[idx] ?? null),
      borderColor: color,
      backgroundColor: 'transparent',
      yAxisID: hasSecondary ? (s.yAxisID || 'y') : 'y',
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 16,
      tension: 0.2,
      spanGaps: true
    };
  });

  const scales: any = {
    x: {
      grid: { display: false },
      ticks: { color: textMuted, maxTicksLimit: 6, font: { size: 11 } }
    },
    y: {
      type: 'linear',
      position: 'left',
      beginAtZero: true,
      title: { display: true, text: yAxisTitle, color: textMain, font: { size: 11 } },
      grid: { color: borderMuted },
      ticks: { color: textMuted, font: { size: 11 } }
    }
  };

  if (hasSecondary) {
    const coColor = getCssVar('--co-color') || textMuted;
    scales.y1 = {
      type: 'linear',
      position: 'right',
      beginAtZero: true,
      title: { display: true, text: 'CO (µg/m³)', color: coColor, font: { size: 11 } },
      grid: { drawOnChartArea: false },
      ticks: { color: coColor, font: { size: 11 } }
    };
  }

  return new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: seriesList.length > 1,
          labels: { color: textMain, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: bgCard,
          titleColor: textMain,
          bodyColor: textMain,
          borderColor: borderMuted,
          borderWidth: 1,
          padding: 10
        }
      },
      scales
    }
  });
}
