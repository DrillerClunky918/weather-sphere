export function renderHome() {
  const outlet = document.getElementById('router-outlet');
  if (outlet) {
    outlet.innerHTML = `
      <div class="header">
        <h1>WeatherSphere</h1>
      </div>
      <div class="info-card">
        <h3>Method</h3>
        <p>We aggregate data from 4 different providers, identify outliers, and calculate a true consensus.</p>
      </div>
    `;
  }
}
