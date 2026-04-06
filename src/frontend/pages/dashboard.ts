// src/frontend/views/dashboard.ts

export function renderDashboard() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="header">
      <h1>Pollutant Guide</h1>
      <p>Understanding Air Quality Standards</p>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <h3>PM 2.5 <span>Fine Particles</span></h3>
        <p>Safe limit: 12 µg/m³</p>
      </div>

      <div class="info-card">
        <h3>PM 10 <span>Coarse Dust</span></h3>
        <p>Safe limit: 50 µg/m³</p>
      </div>

      <div class="info-card">
        <h3>Ozone (O₃) <span>Smog</span></h3>
        <p>Safe limit: 100 µg/m³</p>
      </div>

      <div class="info-card">
        <h3>Methane (CH₄) <span>Greenhouse Gas</span></h3>
        <p>Global background: ~1.9 ppm</p>
      </div>
    </div>
  `;
}
