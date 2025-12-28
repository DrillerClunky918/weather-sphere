const appDiv = document.getElementById('app');

async function loadDashboard() {
  try {
    const response = await fetch('http://localhost:3000/api/weather');
    const cities = await response.json();

    if (appDiv) {
      appDiv.innerHTML = `
        <div style="min-height: 100vh; width: 100%; background-color: #0f172a; color: white; font-family: system-ui, -apple-system, sans-serif; padding: 40px 20px; box-sizing: border-box;">
          
          <div style="max-width: 900px; margin: 0 auto; text-align: center; margin-bottom: 40px;">
            <h1 style="font-size: 3rem; margin: 0 0 10px 0; color: #38bdf8; font-weight: 800; letter-spacing: -1px;">
              WeatherSphere
            </h1>
            <p style="color: #94a3b8; font-size: 1.2rem; margin: 0;">
              Live Air Quality Tracking for <strong style="color: white;">${cities.length}</strong> US Cities
            </p>
          </div>

          <div style="max-width: 900px; margin: 0 auto 20px auto;">
            <input 
              type="text" 
              id="citySearch" 
              placeholder="🔍 Search for a city (e.g. Austin)..." 
              style="
                width: 100%;
                padding: 16px;
                font-size: 1rem;
                background: #1e293b;
                border: 1px solid #334155;
                border-radius: 12px;
                color: white;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
              "
              onfocus="this.style.borderColor='#38bdf8'"
              onblur="this.style.borderColor='#334155'"
            />
          </div>

          <div style="max-width: 900px; margin: 0 auto; background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="overflow-x: auto;">
              <table id="weatherTable" style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="background: #1e293b; border-bottom: 2px solid #334155;">
                    <th style="padding: 16px; color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 0.85rem;">City</th>
                    <th style="padding: 16px; color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 0.85rem;">State</th>
                    <th style="padding: 16px; color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 0.85rem;">AQI</th>
                    <th style="padding: 16px; color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 0.85rem;">Status</th>
                  </tr>
                </thead>
                <tbody id="tableBody">
                  ${cities.map((city: any) => {
                    const report = city.reports[0];
                    const aqi = report?.aqi || 0;
                    
                    // Color Logic
                    let color = '#fff';
                    let status = 'Unknown';
                    
                    if (aqi > 0) {
                       if (aqi <= 50) { color = '#4ade80'; status = 'Good'; }
                       else if (aqi <= 100) { color = '#facc15'; status = 'Moderate'; }
                       else if (aqi <= 150) { color = '#fb923c'; status = 'Sensitive'; }
                       else { color = '#f87171'; status = 'Unhealthy'; }
                    }

                    return `
                    <tr class="city-row" style="border-bottom: 1px solid #334155; transition: background 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">
                      <td style="padding: 16px; font-weight: 500;">${city.name}</td>
                      <td style="padding: 16px; color: #94a3b8;">${city.state}</td>
                      <td style="padding: 16px;">
                        <span style="background: ${color}20; color: ${color}; padding: 4px 12px; border-radius: 99px; font-weight: bold; border: 1px solid ${color}40;">
                          ${report?.aqi ?? '--'}
                        </span>
                      </td>
                      <td style="padding: 16px; color: #94a3b8; font-size: 0.9rem;">
                        ${report ? status : 'Pending...'}
                      </td>
                    </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
              
              <div id="noResults" style="display: none; padding: 40px; text-align: center; color: #94a3b8;">
                No cities found matching that name.
              </div>

            </div>
          </div>
        </div>
      `;

      // --- SEARCH LOGIC (The "Magic" Part) ---
      const searchInput = document.getElementById('citySearch');
      const tableBody = document.getElementById('tableBody');
      const noResults = document.getElementById('noResults');

      searchInput?.addEventListener('keyup', (e) => {
        const term = (e.target as HTMLInputElement).value.toLowerCase();
        const rows = tableBody?.getElementsByTagName('tr');
        let visibleCount = 0;

        if (rows) {
          for (let row of rows) {
            // Get City Name (Column 1) and State (Column 2)
            const cityText = row.cells[0].textContent?.toLowerCase() || "";
            const stateText = row.cells[1].textContent?.toLowerCase() || "";

            // Check if search term matches either
            if (cityText.includes(term) || stateText.includes(term)) {
              row.style.display = ""; // Show row
              visibleCount++;
            } else {
              row.style.display = "none"; // Hide row
            }
          }
        }

        // Toggle "No Results" message
        if (noResults) {
          noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }
      });
    }
  } catch (err) {
    console.error(err);
    if (appDiv) appDiv.innerHTML = "<h2 style='color:red; text-align:center'>Server Offline</h2>";
  }
}

loadDashboard();