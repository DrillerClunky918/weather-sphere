import { STATIC_CITIES } from '../config';

export function renderHome() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  const totalStations = STATIC_CITIES.length;

  outlet.innerHTML = `
    <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 4rem 1.5rem; box-sizing: border-box;">
      
      <!-- Hero Section -->
      <div class="hero-block" style="text-align: center; margin-bottom: 4rem; padding: 4rem 2rem; border-radius: 12px; background: linear-gradient(135deg, rgba(var(--accent-rgb), 0.04) 0%, transparent 100%); border: 1px solid var(--border-muted); box-sizing: border-box;">
        <div style="font-size: 3.5rem; margin-bottom: 1rem;">🌍</div>
        <h1 style="font-size: 3.25rem; margin: 0; letter-spacing: -0.04em; font-weight: 800; background: linear-gradient(to right, var(--text-main), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          WeatherSphere
        </h1>
        <p style="color: var(--text-muted); font-size: 1.25rem; max-width: 650px; margin: 1rem auto 2.5rem auto; line-height: 1.6;">
          A lightweight web application for monitoring air quality. Fetches and processes environmental data directly in your browser.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <button onclick="window.location.hash = '#/dashboard'" class="btn-primary" style="padding: 0.8rem 2rem; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer;">View 7-Day Trends</button>
          <button onclick="window.location.hash = '#/local'" class="btn-primary" style="padding: 0.8rem 2rem; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer;">📍 My City's Air Quality</button>
          <button onclick="window.location.hash = '#/query'" style="padding: 0.8rem 2rem; border-radius: 6px; border: 1px solid var(--border-muted); background: var(--bg-card); color: var(--text-main); font-weight: 600; font-size: 1rem; cursor: pointer;">🔍 Global Search (Open-Meteo)</button>
          <button onclick="window.location.hash = '#/data'" style="padding: 0.8rem 2rem; border-radius: 6px; border: 1px solid var(--border-muted); background: var(--bg-card); color: var(--text-main); font-weight: 600; font-size: 1rem; cursor: pointer;">Station Analytics Grid</button>
        </div>
      </div>

      <!-- Information Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem; margin-bottom: 4rem; width: 100%; box-sizing: border-box;">
        
        <!-- Card 1: Architecture -->
        <div class="info-card" style="border-top: 4px solid var(--accent); background: var(--bg-card); padding: 2rem; border-radius: 8px; border-left: 1px solid var(--border-muted); border-right: 1px solid var(--border-muted); border-bottom: 1px solid var(--border-muted); box-sizing: border-box;">
          <h3 style="font-size: 1.35rem; color: var(--text-main); margin-top: 0; margin-bottom: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
            <span>⚡</span> Client-Side Application
          </h3>
          <p style="margin: 0 0 1rem 0; font-size: 0.98rem; color: var(--text-main); line-height: 1.65; text-align: left;">
            WeatherSphere requests data directly from open APIs within your browser, removing the need for a dedicated intermediate database or backend server.
          </p>
          <p style="margin: 0; font-size: 0.98rem; color: var(--text-main); line-height: 1.65; text-align: left;">
            By using the <strong>Open-Meteo API</strong> directly from the frontend, the browser acts as the direct parser, requesting up-to-date regional values without storing personal or tracking details.
          </p>
        </div>

        <!-- Card 2: Particulate Matter -->
        <div class="info-card" style="border-top: 4px solid var(--accent); background: var(--bg-card); padding: 2rem; border-radius: 8px; border-left: 1px solid var(--border-muted); border-right: 1px solid var(--border-muted); border-bottom: 1px solid var(--border-muted); box-sizing: border-box;">
          <h3 style="font-size: 1.35rem; color: var(--text-main); margin-top: 0; margin-bottom: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
            <span>🔬</span> Particulate Matter (PM) Fractions
          </h3>
          <p style="margin: 0 0 1rem 0; font-size: 0.98rem; color: var(--text-main); line-height: 1.65; text-align: left;">
            Airborne particulates are a critical indicator of regional air quality and respiratory safety.
          </p>
          <p style="margin: 0 0 1rem 0; font-size: 0.95rem; color: var(--text-muted); line-height: 1.6; text-align: left; padding-left: 0.5rem; border-left: 2px solid var(--accent);">
            <strong>The Relationship:</strong> PM10 includes all microscopic matter under 10 micrometers wide. PM2.5 consists of fine particles that sit entirely within that broader metric.
          </p>
          <div style="font-size: 0.92rem; color: var(--text-main); line-height: 1.6; display: flex; flex-direction: column; gap: 0.75rem;">
            <div><strong>• PM10 (Coarse Particles):</strong> Road dust, soot, pollen, and mold. These typically collect in the upper respiratory tract.</div>
            <div><strong>• PM2.5 (Fine Particles):</strong> Smoke, combustion byproducts, and exhaust gases. These fine particles penetrate deeper into the respiratory system.</div>
          </div>
        </div>

        <!-- Card 3: WHO Standards -->
        <div class="info-card" style="border-top: 4px solid var(--accent); background: var(--bg-card); padding: 2rem; border-radius: 8px; border-left: 1px solid var(--border-muted); border-right: 1px solid var(--border-muted); border-bottom: 1px solid var(--border-muted); box-sizing: border-box;">
          <h3 style="font-size: 1.35rem; color: var(--text-main); margin-top: 0; margin-bottom: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
            <span>📈</span> World Health Organization Standards
          </h3>
          <p style="margin: 0 0 1.25rem 0; font-size: 0.98rem; color: var(--text-main); line-height: 1.65; text-align: left;">
            Measurements inside the app reflect air density ratios in micrograms per cubic meter (<code style="font-family: monospace; color: var(--accent);">µg/m³</code>). WHO guidelines recommend the following 24-hour limits:
          </p>
          <div style="font-size: 0.92rem; color: var(--text-main); line-height: 1.6; background: var(--bg-input, rgba(0,0,0,0.1)); padding: 1.25rem; border-radius: 6px; border: 1px solid var(--border-muted);">
            <div style="margin-bottom: 0.75rem;"><strong>• Daily PM2.5 Exposure Limit:</strong> Average concentrations should remain below <span style="color: var(--accent); font-weight:600;">15 µg/m³</span> over a 24-hour period.</div>
            <div><strong>• Daily PM10 Exposure Limit:</strong> Average concentrations should remain below <span style="color: var(--accent); font-weight:600;">45 µg/m³</span> over a 24-hour period.</div>
          </div>
        </div>

        <!-- Card 4: Open-Meteo -->
        <div class="info-card" style="border-top: 4px solid var(--accent); background: var(--bg-card); padding: 2rem; border-radius: 8px; border-left: 1px solid var(--border-muted); border-right: 1px solid var(--border-muted); border-bottom: 1px solid var(--border-muted); box-sizing: border-box;">
          <h3 style="font-size: 1.35rem; color: var(--text-main); margin-top: 0; margin-bottom: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
            <span>🌐</span> Data Aggregation Model
          </h3>
          <p style="margin: 0 0 1rem 0; font-size: 0.98rem; color: var(--text-main); line-height: 1.65; text-align: left;">
            WeatherSphere requests public metrics based on precise coordinates. Open-Meteo combines national meteorological data records with public satellite interpolation models.
          </p>
          <p style="margin: 0; font-size: 0.98rem; color: var(--text-main); line-height: 1.65; text-align: left;">
            Because requests go straight to public endpoints, the site operates independently of private server maintenance, API token expirations, or local proxy downtime.
          </p>
        </div>

      </div>

      <!-- Station Preview Section -->
      <div class="station-preview-section" style="border-top: 1px solid var(--border-muted); padding-top: 2.5rem; width: 100%; box-sizing: border-box;">
        <h2 style="font-size: 1.5rem; margin-top: 0; margin-bottom: 1.5rem; font-weight: 700; letter-spacing: -0.02em; color: var(--text-main);">
          Monitored Station List (${totalStations} Locations)
        </h2>
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; width: 100%;">
          ${STATIC_CITIES.map(city => `
            <div style="background: var(--bg-card); padding: 0.6rem 1.2rem; border-radius: 20px; font-size: 0.88rem; border: 1px solid var(--border-muted); color: var(--text-main); font-weight: 500; display: flex; align-items: center; gap: 0.4rem;">
              <span>📍</span> <span style="font-weight: 700; color: var(--text-main);">${city.name}</span>, ${city.state} 
              <span style="color: var(--text-muted); font-family: monospace; font-size: 0.8rem; margin-left: 0.25rem;">(${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°)</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Footer Context Links -->
      <div style="margin-top: 4rem; padding-top: 1.5rem; border-top: 1px dashed var(--border-muted); font-size: 0.8rem; color: var(--text-muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
        <div>Data Provider: <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; font-weight: 500;">Open-Meteo Air Quality Documentation</a></div>
        <div>Reference Standards: <a href="https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">WHO Guidelines</a></div>
      </div>

    </div>
  `;
}