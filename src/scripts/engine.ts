import { prisma } from '../db';
import 'dotenv/config';

const KEYS = {
  WAQI: process.env.WAQI_TOKEN,
  OPEN_WEATHER: process.env.OPEN_WEATHER_KEY,
  WEATHER_API: process.env.WEATHER_API_KEY,
  TOMORROW: process.env.TOMORROW_KEY
};

// --- FETCHERS ---
async function fetchOpenMeteo(lat: number, lng: number) {
  try {
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=us_aqi,pm10,pm2_5`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      aqi: data.hourly.us_aqi[0],
      pm10: data.hourly.pm10[0],
      pm25: data.hourly.pm2_5[0]
    };
  } catch (e) { return null; }
}

async function fetchWAQI(lat: number, lng: number) {
  if (!KEYS.WAQI) return null;
  try {
    const res = await fetch(`https://api.waqi.info/feed/geo:${lat};${lng}/?token=${KEYS.WAQI}`);
    const data = await res.json();
    if (data.status !== 'ok') return null;
    return {
      aqi: data.data.aqi,
      pm10: data.data.iaqi?.pm10?.v || null, 
      pm25: data.data.iaqi?.pm25?.v || null
    };
  } catch (e) { return null; }
}

async function fetchOpenWeather(lat: number, lng: number) {
  if (!KEYS.OPEN_WEATHER) return null;
  try {
    const res = await fetch(`http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${KEYS.OPEN_WEATHER}`);
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.list[0].components;
    return {
      aqi: data.list[0].main.aqi * 10,
      pm10: raw.pm10,
      pm25: raw.pm2_5
    };
  } catch (e) { return null; }
}

async function fetchWeatherAPI(lat: number, lng: number) {
  if (!KEYS.WEATHER_API) return null;
  try {
    const res = await fetch(`http://api.weatherapi.com/v1/current.json?key=${KEYS.WEATHER_API}&q=${lat},${lng}&aqi=yes`);
    const data = await res.json();
    const air = data.current.air_quality;
    return {
      aqi: air['us-epa-index'] * 10,
      pm10: air.pm10,
      pm25: air.pm2_5
    };
  } catch (e) { return null; }
}

async function fetchTomorrowIO(lat: number, lng: number) {
  if (!KEYS.TOMORROW) return null;
  try {
    const res = await fetch(`https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lng}&apikey=${KEYS.TOMORROW}`);
    if (!res.ok) return null;
    const data = await res.json();
    const vals = data.data.values;
    return {
      aqi: vals.epaIndex,
      pm10: vals.particulateMatter10,
      pm25: vals.particulateMatter25
    };
  } catch (e) { return null; }
}

// --- STATISTICAL ENGINE (STRICT 1.5 IQR) ---
type StatResult = {
  consensus: number;
  breakdown: Record<string, { val: number | null, isOutlier: boolean }>;
};

function analyzeDistribution(inputs: { name: string, val: number | null }[]): StatResult {
  // 1. Filter valid numbers
  const validItems = inputs.filter(i => i.val !== null && i.val > 0) as { name: string, val: number }[];
  
  // If no data, return empty
  if (validItems.length === 0) {
    const emptyBreakdown: any = {};
    inputs.forEach(i => emptyBreakdown[i.name] = { val: null, isOutlier: false });
    return { consensus: 0, breakdown: emptyBreakdown };
  }

  // 2. Sort values for Quartile Calculation
  const sorted = [...validItems].sort((a, b) => a.val - b.val);
  const values = sorted.map(i => i.val);
  
  // 3. Calculate Q1 and Q3
  const q1 = getQuartile(values, 0.25);
  const q3 = getQuartile(values, 0.75);
  const iqr = q3 - q1;
  
  // 4. Define Bounds (1.5 * IQR)
  const lowerBound = q1 - (1.5 * iqr);
  const upperBound = q3 + (1.5 * iqr);

  // 5. Identify Inliers 
  const inliers = validItems.filter(i => i.val >= lowerBound && i.val <= upperBound);
  
  // Result is average of inliers. If ALL are outliers (inliers.length is 0), result is 0.
  const consensus = inliers.length > 0
    ? inliers.reduce((sum, i) => sum + i.val, 0) / inliers.length
    : 0;

  // 6. Build Breakdown Map
  const breakdown: any = {};
  inputs.forEach(item => {
    if (item.val === null || item.val <= 0) {
      breakdown[item.name] = { val: null, isOutlier: false };
    } else {
      // Simply check bounds.
      const isOutlier = item.val < lowerBound || item.val > upperBound;
      breakdown[item.name] = { 
        val: parseFloat(item.val.toFixed(1)), 
        isOutlier: isOutlier 
      };
    }
  });

  return { consensus, breakdown };
}

// Helper: Quartile calculation
function getQuartile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

// --- MAIN LOOP ---
async function updateWeather() {
  console.log(`\n[${new Date().toLocaleTimeString()}] Starting Update...`);
  
  try {
    const cities = await prisma.city.findMany();

    for (const city of cities) {
      const providers = [
        { name: 'Open-Meteo', fn: () => fetchOpenMeteo(city.lat, city.lng) },
        { name: 'WAQI',       fn: () => fetchWAQI(city.lat, city.lng) },
        { name: 'OpenWeather',fn: () => fetchOpenWeather(city.lat, city.lng) },
        { name: 'WeatherAPI', fn: () => fetchWeatherAPI(city.lat, city.lng) },
        { name: 'Tomorrow.io',fn: () => fetchTomorrowIO(city.lat, city.lng) }
      ];

      const results = await Promise.all(providers.map(async (p) => {
        const val = await p.fn();
        return { name: p.name, data: val };
      }));

      // Prepare Inputs
      const pm25Inputs = results.map(r => ({ name: r.name, val: r.data?.pm25 || null }));
      const pm10Inputs = results.map(r => ({ name: r.name, val: r.data?.pm10 || null }));

      // Run Stats
      const statsPm25 = analyzeDistribution(pm25Inputs);
      const statsPm10 = analyzeDistribution(pm10Inputs);

      // Merge Data
      const combinedSources: Record<string, any> = {};
      results.forEach(r => {
        combinedSources[r.name] = {
          pm25: statsPm25.breakdown[r.name],
          pm10: statsPm10.breakdown[r.name]
        };
      });

      console.log(`  ${city.name}: PM2.5 Consensus: ${statsPm25.consensus.toFixed(1)} | PM10 Consensus: ${statsPm10.consensus.toFixed(1)}`);

      await prisma.weatherReport.create({
        data: {
          aqi: Math.round(statsPm25.consensus * 4),
          pm10: parseFloat(statsPm10.consensus.toFixed(2)),
          pm25: parseFloat(statsPm25.consensus.toFixed(2)),
          temp: 0,
          cityId: city.id,
          sources: JSON.stringify(combinedSources)
        }
      });
      
      await new Promise(r => setTimeout(r, 100));
    }
  } catch (error) { console.error(error); }
}

updateWeather();
setInterval(updateWeather, 60 * 60 * 1000);
