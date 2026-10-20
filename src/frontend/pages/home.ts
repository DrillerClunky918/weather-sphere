export function renderHome() {
  const outlet = document.getElementById('router-outlet');
  if (!outlet) return;

  outlet.innerHTML = `
    <div class="container" style="max-width: 1000px; margin: 0 auto; padding: 4rem 1.5rem; display: flex; flex-direction: column; align-items: center;">
      
      <div class="header" style="margin-bottom: 3rem; text-align: center;">
        <h1 style="font-size: 3rem; margin: 0; letter-spacing: -0.03em;">WeatherSphere</h1>
        <p style="color: var(--text-muted); font-size: 1.15rem; margin-top: 0.5rem; margin-bottom: 0;">A smart dashboard that cross-references and verifies global air quality data in real time.</p>
      </div>

      <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; width: 100%;">
        
        <div class="info-card" style="flex: 1 1 calc(50% - 0.75rem); min-width: 300px; cursor: default; transform: none; border-top: 4px solid var(--accent); padding: 1.75rem; box-shadow: none; box-sizing: border-box;">
          <h3 style="font-size: 1.15rem; color: var(--text-main); margin-bottom: 0.75rem; text-transform: none; letter-spacing: normal; display: block;">
            What This Website Does
          </h3>
          <p style="margin: 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
            Most weather apps rely on just one source for their data. WeatherSphere is different: it simultaneously pulls live air quality data from four competing networks—Open-Meteo, WAQI, OpenWeather, and WeatherAPI—across 10 major global cities.
          </p>
          <p style="margin: 1rem 0 0 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
            Because weather stations frequently experience technical glitches, lag, or report missing points, our system automatically compares them side-by-side. By cross-checking the numbers, it filters out sudden errors and establishes an accurate, trustworthy baseline.
          </p>
        </div>

        <div class="info-card" style="flex: 1 1 calc(50% - 0.75rem); min-width: 300px; cursor: default; transform: none; border-top: 4px solid var(--accent); padding: 1.75rem; box-shadow: none; box-sizing: border-box;">
          <h3 style="font-size: 1.15rem; color: var(--text-main); margin-bottom: 0.75rem;">
            Understanding Particulates (PM)
          </h3>
          <p style="margin: 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
            When we talk about air pollution, most people immediately think of greenhouse gases like carbon dioxide. Statistics show that while <strong>85%</strong> of people know about carbon gases, only <strong>49.7%</strong> actually understand what "particulate matter" (PM) means. Yet, particulates are a much more immediate threat to your daily health.
          </p>
          <p style="margin: 1rem 0 0 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
            <strong>The Matryoshka Doll Rule:</strong> A critical detail to remember is that <u>PM10 actually includes PM2.5</u>. PM10 refers to all tiny particles in the air under 10 micrometers wide. PM2.5 is simply the extra-fine subset of particles sitting inside that broader group.
          </p>
          <p style="margin: 1rem 0 0 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
            <strong>• PM10 (Coarse Particles):</strong> Things like road dust, pollen, and mold. They are large enough to get caught in your throat and upper respiratory tract, causing coughing and allergies.<br/><br/>
            <strong>• PM2.5 (Fine Particles):</strong> Microscopic soot, smoke, and chemical droplets from car exhaust and factories. Because they are so incredibly small, they slip right past your body's physical lung filters, entering your bloodstream and causing serious long-term health risks.
          </p>
        </div>

        <div class="info-card" style="flex: 1 1 calc(50% - 0.75rem); min-width: 300px; cursor: default; transform: none; border-top: 4px solid var(--accent); padding: 1.75rem; box-shadow: none; box-sizing: border-box;">
          <h3 style="font-size: 1.15rem; color: var(--text-main); margin-bottom: 0.75rem;">
            How to Read the Data
          </h3>
          <p style="margin: 0 0 1rem 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
            When you look at the numbers on our <strong>Global Table</strong>, they are measured in micrograms per cubic meter (µg/m³). You can use official World Health Organization (WHO) safety guidelines to interpret what you see:
          </p>
          <div style="font-size: 0.9rem; color: var(--text-main); line-height: 1.6; text-align: left; background: var(--base); padding: 1rem; border-radius: 6px; border: 1px solid var(--border-muted);">
            <div style="margin-bottom: 0.5rem;"><strong>• Safe PM2.5 Levels:</strong> Should ideally stay below 15 µg/m³ over a 24-hour period.</div>
            <div style="margin-bottom: 0.5rem;"><strong>• Safe PM10 Levels:</strong> Should ideally stay below 45 µg/m³ over a 24-hour period.</div>
            <div><strong>• Spotting a Discrepancy:</strong> If you see a gap larger than 10 µg/m³ between sources on a city, it means one of the APIs is experiencing a localized tracking error or sensor failure.</div>
          </div>
          <p style="margin: 1rem 0 0 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
            To help you compare, here is a quick look at how each of our four data engines operates:
          </p>
          <div style="font-size: 0.9rem; color: var(--text-main); line-height: 1.5; text-align: left; margin-top: 0.75rem;">
            <div style="margin-bottom: 0.5rem;"><strong>• Open-Meteo:</strong> Uses weather forecasting and satellite models. Always online with no gaps, but can miss small, sudden ground-level spikes.</div>
            <div style="margin-bottom: 0.5rem;"><strong>• WAQI:</strong> Pulls directly from physical, real-world monitoring stations. Highly accurate, but stations frequently go offline for maintenance.</div>
            <div style="margin-bottom: 0.5rem;"><strong>• OpenWeather:</strong> Blends mathematical grids and local airport reports. Very reliable uptime, but covers broad, generalized regions.</div>
            <div><strong>• WeatherAPI:</strong> Combines multiple regional data sources. Great for cohesive formatting, but their exact background data-mixing math is private.</div>
          </div>
        </div>

        <div class="info-card" style="flex: 1 1 calc(50% - 0.75rem); min-width: 300px; cursor: default; transform: none; border-top: 4px solid var(--accent); padding: 1.75rem; box-shadow: none; box-sizing: border-box;">
          <h3 style="font-size: 1.15rem; color: var(--text-main); margin-bottom: 0.75rem;">
            Filtering Out Errors (The Math)
          </h3>
          <p style="margin: 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
            If one sensor breaks and starts reporting a massive, impossible spike in pollution, it shouldn't ruin the whole app's average. To prevent this, WeatherSphere uses a clean formula called the Interquartile Range (<code style="font-family: monospace; color: var(--accent);">IQR = Q3 - Q1</code>) to clean the data.
          </p>
          <p style="margin: 1rem 0 0 0; font-size: 0.95rem; color: var(--text-main); line-height: 1.6; text-align: left;">
            The app looks at all four numbers reported for a city, automatically throws away the highest and lowest extremes, and focuses entirely on the reliable middle chunk of data. It calculates a safe "normal fence" range. If an API breaks through those fences due to a software glitch, our script flags it as a temporary outlier and drops it from the final city average.
          </p>
          <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-muted); font-size: 0.8rem; color: var(--text-muted); text-align: left; line-height: 1.6;">
            <strong style="display: block; margin-bottom: 0.4rem; color: var(--text-main); font-size: 0.85rem;">Sources:</strong>
            <div style="margin-bottom: 0.4rem;">
              • <a href="https://www.who.int/news-room/fact-sheets/detail/ambient-(outdoor)-air-quality-and-health" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent);">World Health Organization (WHO) Guidelines</a><br/>
              • <a href="https://www.epa.gov/criteria-air-pollutants/naaqs-table" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent);">US EPA NAAQS Framework</a><br/>
              • <a href="https://climatecommunication.yale.edu/publications/" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent);">Yale Climate Communication Index</a><br/>
              • <a href="https://atmosphere.copernicus.eu/global-reactive-gases" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent);">Copernicus CAMS Validation Matrix</a>
            </div>
            <div style="border-top: 1px dashed var(--border-muted); margin-top: 0.5rem; padding-top: 0.5rem;">
              • <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent);">Open-Meteo Air Quality Reference</a><br/>
              • <a href="https://aqicn.org/api/" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent);">WAQI Real-Time Tracking API</a><br/>
              • <a href="https://openweathermap.org/api/air-pollution" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent);">OpenWeather Pollution Core Docs</a><br/>
              • <a href="https://www.weatherapi.com/docs/" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px dotted var(--accent);">WeatherAPI Telemetry Matrix</a>
            </div>
          </div>
        </div>

      </div>

    </div>
  `;
}