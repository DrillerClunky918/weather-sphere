import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

let particulatesChart: Chart | null = null;

const getStyleColor = (varName: string) => 
    getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

export function renderDashboard() {
    const outlet = document.getElementById('router-outlet');
    if (!outlet) return;

    outlet.innerHTML = `
    <div class="header">
      <h1>Advanced Particulate Analytics</h1>
      <p>Visualizing microscopic mass fractions across a 7-day trend line.</p>
    </div>

    <div class="controls-bar" style="margin-bottom: 2rem; display: flex; gap: 1.5rem; align-items: flex-end;">
      <div class="control-group">
        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Select Station Node</label>
        <select id="cityDropdown">
          <option value="">Loading...</option>
        </select>
      </div>

      <div class="control-group">
        <label style="display: block; margin-bottom: 0.5rem; color: var(--text-muted);">Audit Source</label>
        <select id="sourceDropdown">
          <option value="all">All Sources (Merged Average)</option>
          <option value="Open-Meteo">Open-Meteo</option>
          <option value="WAQI">WAQI (World Air Quality Index)</option>
          <option value="OpenWeather">OpenWeather</option>
          <option value="WeatherAPI">WeatherAPI</option>
        </select>
      </div>

      <button id="updateChartBtn" class="btn-primary">Refresh Trends</button>
    </div>

    <div class="dashboard-section" style="background: var(--bg-card); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-muted);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div>
          <h2 style="margin: 0; color: var(--text-main); font-size: 1.5rem;">Mass Concentration Fractions</h2>
        </div>
        <div class="checkbox-group" style="display: flex; gap: 1rem;">
          <label><input type="checkbox" class="particulate-check" value="pm25" checked> PM 2.5</label>
          <label><input type="checkbox" class="particulate-check" value="pm10" checked> PM 10</label>
        </div>
      </div>
      <div class="chart-wrapper" style="position: relative; height: 450px; width: 100%;">
        <canvas id="particulatesChartCanvas"></canvas>
      </div>
    </div>
  `;

    populateCities();

    document.getElementById('updateChartBtn')?.addEventListener('click', updateAnalytics);
    document.getElementById('sourceDropdown')?.addEventListener('change', updateAnalytics);
    
    document.querySelectorAll('.particulate-check').forEach(cb => {
        cb.addEventListener('change', updateAnalytics);
    });
}

async function populateCities() {
    const dropdown = document.getElementById('cityDropdown') as HTMLSelectElement;
    try {
        const res = await fetch('http://localhost:3000/api/weather');
        const cities = await res.json();
        dropdown.innerHTML = cities.map((c: any) => `<option value="${c.id}">${c.name}</option>`).join('');

        const lastId = localStorage.getItem('selectedCityId');
        const lastSource = localStorage.getItem('selectedSource');

        if (lastId) dropdown.value = lastId;
        
        const sourceDropdown = document.getElementById('sourceDropdown') as HTMLSelectElement;
        if (sourceDropdown && lastSource) {
            sourceDropdown.value = lastSource;
        }

        if (lastId) {
            updateAnalytics();
        }
    } catch (e) {
        dropdown.innerHTML = '<option>Error</option>';
    }
}

async function updateAnalytics() {
    const cityId = (document.getElementById('cityDropdown') as HTMLSelectElement).value;
    const sourceElement = document.getElementById('sourceDropdown') as HTMLSelectElement;
    const source = sourceElement ? sourceElement.value : 'all';
    const pCanvas = document.getElementById('particulatesChartCanvas') as HTMLCanvasElement;
    
    if (!cityId || !pCanvas) return;

    localStorage.setItem('selectedCityId', cityId);
    localStorage.setItem('selectedSource', source);

    const activeParticulates = Array.from(document.querySelectorAll('.particulate-check:checked'))
        .map(cb => (cb as HTMLInputElement).value);

    const res = await fetch(`http://localhost:3000/api/proxy/trends/${cityId}?source=${source}`);
    const data = await res.json();

    if (particulatesChart) particulatesChart.destroy();

    const colorConfigs: Record<string, any> = {
        pm25: { label: 'PM 2.5', color: getStyleColor('--pm25-color') || '#ff6384' },
        pm10: { label: 'PM 10', color: getStyleColor('--pm10-color') || '#36a2eb' }
    };

    const buildDataset = (key: string) => {
        const cfg = colorConfigs[key];
        return {
            label: `${cfg.label} (µg/m³)`,
            data: data.map((d: any) => d[key] === null ? null : d[key]),
            borderColor: cfg.color,
            backgroundColor: cfg.color + '10',
            tension: 0.15,
            borderWidth: 2,
            pointRadius: data.length > 150 ? 0 : 3,
            spanGaps: true
        };
    };

    particulatesChart = new Chart(pCanvas, {
        type: 'line',
        data: {
            labels: data.map((d: any) => new Date(d.createdAt)),
            datasets: activeParticulates.map(buildDataset)
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'hour', displayFormats: { hour: 'MMM d, h a' } },
                    ticks: {
                        color: getStyleColor('--text-muted'),
                        maxTicksLimit: 8,
                        maxRotation: 0,
                        minRotation: 0
                    },
                    grid: { color: `color-mix(in srgb, ${getStyleColor('--border-muted')} 5%, transparent)` }
                },
                y: {
                    type: 'linear',
                    beginAtZero: true,
                    title: { display: true, text: 'Mass Concentration (µg/m³)', color: getStyleColor('--text-main') },
                    ticks: {
                        color: getStyleColor('--text-muted'),
                        callback: (value: any) => Number(value).toLocaleString()
                    },
                    grid: { color: `color-mix(in srgb, ${getStyleColor('--border-muted')} 5%, transparent)` }
                }
            },
            plugins: {
                legend: { labels: { color: getStyleColor('--text-main'), usePointStyle: true } },
                tooltip: {
                    backgroundColor: getStyleColor('--bg-dark') || '#1e293b',
                    borderColor: getStyleColor('--border-muted'),
                    borderWidth: 1
                }
            }
        }
    });
}