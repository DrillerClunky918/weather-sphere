export function renderGlobalQuery() {
    const outlet = document.getElementById('router-outlet');
    if (!outlet) return;

    outlet.innerHTML = `
    <div class="container">
      <div class="header" style="text-align: center;">
        <h1>Live Search</h1>
        <p style="color: var(--text-muted);">Query real-time particulate metrics anywhere on Earth via open client-side geocoding.</p>
      </div>

      <div class="dashboard-section" style="background: var(--bg-card); padding: 2rem; border-radius: 8px; border: 1px solid var(--border-muted); max-width: 650px; margin: 0 auto;">
        <form id="auditForm" style="display: flex; gap: 1rem; margin-bottom: 2rem;">
          <input 
            type="text" 
            id="cityInput" 
            placeholder="Enter a target city (e.g. London, Bangkok, Tokyo)..." 
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
    button.innerText = "Searching...";
    output.innerHTML = `<p style="color: var(--text-muted); text-align: center;">Resolving target geospatial points...</p>`;

    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`);
        if (!geoRes.ok) throw new Error('Geocoding service unavailable.');
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('Target location could not be verified by geocoder.');
        }

        const { latitude, longitude, name, country } = geoData.results[0];

        const aqRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5`);
        if (!aqRes.ok) throw new Error('Air quality service unavailable.');
        const aqData = await aqRes.json();

        if (!aqData.current) {
            throw new Error('Target station returned empty atmospheric response fields.');
        }

        const pm25 = aqData.current.pm2_5;
        const pm10 = aqData.current.pm10;
        const dataFailedIntegrity = pm25 > pm10;

        input.value = `${name}, ${country}`;

        let alertMarkup = '';
        if (dataFailedIntegrity) {
            alertMarkup = `
        <div style="background: rgba(239, 68, 68, 0.1); color: var(--error-color); padding: 0.75rem; border-radius: 6px; font-size: 0.9rem; font-weight: bold; text-align: center; border: 1px solid var(--error-color); margin-top: 1.5rem;">
          ⚠ Anomaly Detected: PM 2.5 (${pm25} µg/m³) exceeds PM 10 (${pm10} µg/m³). Data reporting integrity compromised.
        </div>
      `;
        }

        output.innerHTML = `
      <div style="border-top: 1px solid var(--border-muted); padding-top: 1.5rem; margin-top: 1rem;">
        <h3 style="color: var(--text-main); margin-bottom: 0.5rem;">Live Open-Meteo Report: ${name} (${country})</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Coordinates: ${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E</p>
        
        <div style="display: flex; gap: 2rem;">
          <div style="flex: 1; background: var(--bg-input); padding: 1rem; border-radius: 6px; border-left: 4px solid var(--pm25-color);">
            <div style="font-size: 0.85rem; color: var(--text-muted);">PM 2.5</div>
            <div style="font-size: 1.75rem; font-weight: bold; color: var(--text-main); margin-top: 0.25rem;">${pm25} <span style="font-size: 1rem; color: var(--text-muted);">µg/m³</span></div>
          </div>
          <div style="flex: 1; background: var(--bg-input); padding: 1rem; border-radius: 6px; border-left: 4px solid var(--pm10-color);">
            <div style="font-size: 0.85rem; color: var(--text-muted);">PM 10</div>
            <div style="font-size: 1.75rem; font-weight: bold; color: var(--text-main); margin-top: 0.25rem;">${pm10} <span style="font-size: 1rem; color: var(--text-muted);">µg/m³</span></div>
          </div>
        </div>
        
        ${alertMarkup}
      </div>
    `;
    } catch (err: any) {
        output.innerHTML = `<p style="color: var(--error-color); text-align: center; font-weight: bold; margin-top: 1rem;">${err.message}</p>`;
    } finally {
        button.disabled = false;
        button.innerText = "Search Location";
    }
}