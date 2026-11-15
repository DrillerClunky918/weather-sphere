import { getTrackedCities, POLLUTANT_LIST } from '../config';

export function renderHome() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  const stations = getTrackedCities();

  const pmDiagramSvg = `
    <div class="diagram-wrap">
      <svg viewBox="0 0 760 220" role="img" aria-label="Scale comparison between human hair, PM 10, and PM 2.5 particles">
        <rect x="0" y="0" width="760" height="220" fill="transparent" />

        <!-- Human Hair Reference -->
        <circle cx="135" cy="110" r="78" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-dasharray="5 4" />
        <circle cx="135" cy="110" r="72" fill="var(--bg-surface)" opacity="0.55" />
        <text x="135" y="104" text-anchor="middle" fill="var(--text-strong)" font-size="13" font-weight="700">Human Hair</text>
        <text x="135" y="122" text-anchor="middle" fill="var(--text-muted)" font-size="11">~50–70 µm diameter</text>

        <!-- Arrow 1 -->
        <line x1="230" y1="110" x2="295" y2="110" stroke="var(--border-muted)" stroke-width="2" />
        <polygon points="295,105 305,110 295,115" fill="var(--border-muted)" />

        <!-- PM10 Circle -->
        <circle cx="385" cy="110" r="34" fill="var(--pm10-color)" opacity="0.22" stroke="var(--pm10-color)" stroke-width="2.5" />
        <circle cx="385" cy="110" r="14" fill="var(--pm10-color)" />
        <text x="385" y="164" text-anchor="middle" fill="var(--pm10-color)" font-size="13" font-weight="700">PM 10 (≤ 10 µm)</text>
        <text x="385" y="182" text-anchor="middle" fill="var(--text-muted)" font-size="11">Dust, pollen, mold</text>
        <text x="385" y="198" text-anchor="middle" fill="var(--text-muted)" font-size="10">Reaches nose &amp; upper airways</text>

        <!-- Arrow 2 -->
        <line x1="465" y1="110" x2="530" y2="110" stroke="var(--border-muted)" stroke-width="2" />
        <polygon points="530,105 540,110 530,115" fill="var(--border-muted)" />

        <!-- PM2.5 Circle -->
        <circle cx="630" cy="110" r="24" fill="var(--pm25-color)" opacity="0.18" stroke="var(--pm25-color)" stroke-width="1.5" stroke-dasharray="3 3" />
        <circle cx="630" cy="110" r="5" fill="var(--pm25-color)" />
        <text x="630" y="164" text-anchor="middle" fill="var(--pm25-color)" font-size="13" font-weight="700">PM 2.5 (≤ 2.5 µm)</text>
        <text x="630" y="182" text-anchor="middle" fill="var(--text-muted)" font-size="11">Smoke, exhaust, combustion</text>
        <text x="630" y="198" text-anchor="middle" fill="var(--text-muted)" font-size="10">Penetrates deep lung alveoli</text>
      </svg>
    </div>
  `;

  const pollutantGuideCards = POLLUTANT_LIST.map(
    (p) => `
      <div class="info-card static-card accent-${p.key}">
        <h3 class="title-${p.key}">${p.label}</h3>
        <p class="subtitle">${p.guide}</p>
        <div class="threshold-meta">
          Good: ≤ ${p.good} ${p.unit} &nbsp;•&nbsp; Fair: ≤ ${p.fair} ${p.unit}
        </div>
      </div>
    `
  ).join('');

  outlet.innerHTML = `
    <div class="container">
      <!-- Hero Section -->
      <div class="aqi-card">
        <div class="header">
          <h1>WeatherSphere</h1>
          <p class="subtitle">
            Monitor live air quality, 7-day historical records, and 7-day atmospheric forecasts directly in your browser.
          </p>
        </div>

        <div class="controls-center location-meta-row">
          <button id="homeDashBtn" class="btn-primary">View 7-Day Trends</button>
          <button id="homeLocalBtn" class="btn-primary">My City's Air Quality</button>
          <button id="homeQueryBtn" class="btn-ghost">Live Search</button>
          <button id="homeTableBtn" class="btn-ghost">Global Table</button>
        </div>
      </div>

      <!-- Particulate Matter Fractions + Diagram -->
      <div class="aqi-card">
        <div>
          <h2 class="section-title">Particulate Matter (PM 10 vs. PM 2.5)</h2>
          <p class="subtitle">
            <strong>PM 10</strong> covers airborne particles 10 micrometers or smaller (road dust, pollen, construction debris) that settle in the nose and throat.
            <strong>PM 2.5</strong> is a finer subset under 2.5 micrometers (smoke, vehicle exhaust, industrial combustion) capable of reaching deep into the lungs.
          </p>
        </div>
        ${pmDiagramSvg}
      </div>

      <!-- WHO Standards -->
      <div class="aqi-hero-grid">
        <div class="aqi-card border-top-good">
          <div>
            <span class="card-kicker">WHO 24-Hour Exposure Guideline</span>
            <h3 class="section-title">PM 2.5 Limit: 15 µg/m³</h3>
            <p class="subtitle">
              Average 24-hour fine particulate concentrations should remain below <strong>15 µg/m³</strong> to minimize cardiovascular and respiratory strain.
            </p>
          </div>
        </div>

        <div class="aqi-card border-top-fair">
          <div>
            <span class="card-kicker">WHO 24-Hour Exposure Guideline</span>
            <h3 class="section-title">PM 10 Limit: 45 µg/m³</h3>
            <p class="subtitle">
              Average 24-hour coarse particulate concentrations should remain below <strong>45 µg/m³</strong> to prevent upper-airway and eye irritation.
            </p>
          </div>
        </div>
      </div>

      <!-- All Tracked Metrics Reference -->
      <h2 class="section-title">Tracked Air Quality Metrics</h2>
      <div class="metric-guide-grid">
        ${pollutantGuideCards}
      </div>

      <!-- Technical Architecture (Moved Later per Feedback) -->
      <div class="aqi-hero-grid">
        <div class="aqi-card">
          <div>
            <h3 class="card-kicker">Client-Side Application</h3>
            <p class="subtitle">
              WeatherSphere queries open meteorological endpoints directly from your browser without an intermediate backend database, account sign-up, or user tracking.
            </p>
          </div>
        </div>

        <div class="aqi-card">
          <div>
            <h3 class="card-kicker">Data Aggregation Model</h3>
            <p class="subtitle">
              Coordinates are resolved against the <strong>Open-Meteo Air Quality API</strong>, blending national ground station observations with atmospheric chemistry forecasts.
            </p>
          </div>
        </div>
      </div>

      <!-- Station Preview Section -->
      <div class="aqi-card">
        <h2 class="section-title">Monitored Station List (${stations.length} Locations)</h2>
        <div class="location-meta-row">
          ${stations
            .map(
              (city) => `
                <span class="status-pill">
                  ${city.name}, ${city.state} (${city.lat.toFixed(1)}°, ${city.lon.toFixed(1)}°)
                </span>
              `
            )
            .join('')}
        </div>
      </div>

      <!-- Footer Links -->
      <div class="timeline-panel-header">
        <span class="subtitle">
          Data Provider: <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener noreferrer" class="text-accent">Open-Meteo Air Quality API</a>
        </span>
        <span class="subtitle">
          Standards: <a href="https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health" target="_blank" rel="noopener noreferrer" class="text-muted">WHO Air Quality Guidelines</a>
        </span>
      </div>
    </div>
  `;

  document.getElementById('homeDashBtn')?.addEventListener('click', () => {
    window.location.hash = '#/dashboard';
  });
  document.getElementById('homeLocalBtn')?.addEventListener('click', () => {
    window.location.hash = '#/local';
  });
  document.getElementById('homeQueryBtn')?.addEventListener('click', () => {
    window.location.hash = '#/query';
  });
  document.getElementById('homeTableBtn')?.addEventListener('click', () => {
    window.location.hash = '#/data';
  });
}
