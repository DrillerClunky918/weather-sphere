import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

let dashboardChart: Chart | null = null;

const getStyleColor = (varName: string) => 
    getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

export function renderDashboard() {
    const outlet = document.getElementById('router-outlet');
    if (!outlet) return;

    outlet.innerHTML = `
    <div class="header">
      <h1>Advanced Air Analytics</h1>
      <p>Visualizing 7-day trends with intelligent gap interpolation (µg/m³).</p>
    </div>

    <div class="controls-bar">
      <div class="control-group">
        <label>Select City</label>
        <select id="cityDropdown">
          <option value="">Loading...</option>
        </select>
      </div>

      <div class="control-group">
        <label>Toggle Pollutants</label>
        <div class="checkbox-group">
          <label><input type="checkbox" class="pollutant-check" value="pm25" checked> PM 2.5</label>
          <label><input type="checkbox" class="pollutant-check" value="pm10" checked> PM 10</label>
          <label><input type="checkbox" class="pollutant-check" value="ozone" checked> Ozone</label>
          <label><input type="checkbox" class="pollutant-check" value="methane" checked> Methane</label>
        </div>
      </div>

      <button id="updateChartBtn" class="btn-primary">Update Chart</button>
    </div>

    <div class="chart-wrapper">
      <canvas id="mainDashboardChart"></canvas>
    </div>
  `;

    populateCities();
    document.getElementById('updateChartBtn')?.addEventListener('click', updateAnalytics);
}

async function populateCities() {
    const dropdown = document.getElementById('cityDropdown') as HTMLSelectElement;
    try {
        const res = await fetch('http://localhost:3000/api/weather');
        const cities = await res.json();
        dropdown.innerHTML = cities.map((c: any) => `<option value="${c.id}">${c.name}</option>`).join('');

        const lastId = localStorage.getItem('selectedCityId');
        if (lastId) {
            dropdown.value = lastId;
            updateAnalytics();
        }
    } catch (e) {
        dropdown.innerHTML = '<option>Error</option>';
    }
}

async function updateAnalytics() {
    const cityId = (document.getElementById('cityDropdown') as HTMLSelectElement).value;
    const canvas = document.getElementById('mainDashboardChart') as HTMLCanvasElement;
    if (!cityId || !canvas) return;

    localStorage.setItem('selectedCityId', cityId);
    const selectedKeys = Array.from(document.querySelectorAll('.pollutant-check:checked')).map(cb => (cb as HTMLInputElement).value);

    const res = await fetch(`http://localhost:3000/api/proxy/trends/${cityId}`);
    const data = await res.json();

    if (dashboardChart) dashboardChart.destroy();

    const configs: Record<string, any> = {
        pm25: { label: 'PM 2.5', color: getStyleColor('--pm25-color') },
        pm10: { label: 'PM 10', color: getStyleColor('--pm10-color') },
        ozone: { label: 'Ozone', color: getStyleColor('--ozone-color') },
        methane: { label: 'Methane', color: getStyleColor('--methane-color') }
    };

    const datasets = selectedKeys.map(key => {
        const cfg = configs[key];
        return {
            label: `${cfg.label} (µg/m³)`,
            data: data.map((d: any) => (d[key] === 0 || d[key] === null) ? null : d[key]),
            borderColor: cfg.color,
            backgroundColor: cfg.color + '22', 
            tension: 0.3,
            borderWidth: 2,
            pointRadius: data.length > 150 ? 0 : 3,
            spanGaps: true
        };
    });

    dashboardChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: data.map((d: any) => new Date(d.createdAt)),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'hour', displayFormats: { hour: 'MMM d, h a' } },
                    ticks: { color: getStyleColor('--text-muted') },
                    grid: { color: getStyleColor('--border-muted'), opacity: 0.1 }
                },
                y: {
                    beginAtZero: false,
                    title: { display: true, text: 'Concentration (µg/m³)', color: getStyleColor('--text-main') },
                    ticks: { color: getStyleColor('--text-muted') },
                    grid: { color: getStyleColor('--border-muted'), opacity: 0.1 }
                }
            },
            plugins: {
                legend: { labels: { color: getStyleColor('--text-main'), usePointStyle: true } },
                tooltip: {
                    backgroundColor: getStyleColor('--bg-dark'),
                    borderColor: getStyleColor('--border-muted'),
                    borderWidth: 1
                }
            }
        }
    });
}