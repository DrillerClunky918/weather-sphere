export function renderHome() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container" style="max-width: 600px; margin: 0 auto; padding-top: 4rem; display: flex; flex-direction: column; align-items: center;">
      <div class="header" style="margin-bottom: 2rem;">
        <h1 style="font-size: 2.5rem; margin: 0;">WeatherSphere</h1>
        <p style="color: var(--text-muted); font-size: 1rem; margin-top: 0.5rem; margin-bottom: 0;">Global air quality audit tool.</p>
      </div>
      
      <div class="info-card" style="cursor: default; transform: none; border-top: 4px solid var(--accent); padding: 1.5rem; width: 100%; box-shadow: none;">
        <h3 style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 0.75rem; text-transform: none; letter-spacing: normal; display: block;">
          How it works
        </h3>
        <p style="margin: 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
          We pull real-time data from 4 competing air quality APIs: Open-Meteo, WAQI, OpenWeather, and WeatherAPI. 
        </p>
        <p style="margin: 1rem 0 0 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
          Because stations frequently report missing points or conflicting metrics, our system filters out sudden mathematical outliers. This helps you isolate reporting anomalies and compare the actual performance of each provider side-by-side.
        </p>
      </div>
    </div>
  `;
}