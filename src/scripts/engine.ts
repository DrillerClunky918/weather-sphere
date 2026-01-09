import { prisma } from '../db';
import 'dotenv/config';

// --- CONFIGURATION ---
const KEYS = {
  WAQI: process.env.WAQI_TOKEN,
  OPEN_WEATHER: process.env.OPEN_WEATHER_KEY,
  WEATHER_API: process.env.WEATHER_API_KEY,
  TOMORROW: process.env.TOMORROW_KEY
};

// --- DATA FETCHERS ---
async function fetchOpenMeteo(lat: number, lng: number) {
  try {
    const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&hourly=pm10,pm2_5,ozone,methane`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      pm10: data.hourly.pm10[0] || null,
      pm25: data.hourly.pm2_5[0] || null,
      ozone: data.hourly.ozone[0] || null,
      methane: data.hourly.methane[0] || null
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
      pm10: data.data.iaqi?.pm10?.v || null, 
      pm25: data.data.iaqi?.pm25?.v || null,
      ozone: data.data.iaqi?.o3?.v || null,
      methane: null // WAQI does not track CH4
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
      pm10: raw.pm10 || null,
      pm25: raw.pm2_5 || null,
      ozone: raw.o3 || null,
      methane: null // OpenWeatherMap does not track CH4
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
      pm10: air.pm10 || null,
      pm25: air.pm2_5 || null,
      ozone: air.o3 || null,
      methane: air.ch4 || null 
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
      pm10: vals.particulateMatter10,
      pm25: vals.particulateMatter25,
      ozone: vals.ozone,
      methane: vals.methane || null
    };
  } catch (e) { return null; }
}

// --- STATISTICAL ENGINE ---
type StatResult = {
  mean: number;
  breakdown: Record<string, { val: number | null, isOutlier: boolean }>;
};

function processDistribution(inputs: { name: string, val: number | null }[]): StatResult {
  // 1. Clean Data
  const validItems = inputs.filter(i => i.val !== null && i.val > 0) as { name: string, val: number }[];
  
  if (validItems.length === 0) {
    const emptyBreakdown: any = {};
    inputs.forEach(i => emptyBreakdown[i.name] = { val: null, isOutlier: false });
    return { mean: 0, breakdown: emptyBreakdown };
  }

  // 2. Sort
  const sorted = [...validItems].sort((a, b) => a.val - b.val);
  const values = sorted.map(i => i.val);
  
  // 3. IQR Calculation
  const q1 = calculateQuartile(values, 0.25);
  const q3 = calculateQuartile(values, 0.75);
  const iqr = q3 - q1;
  
  const lowerFence = q1 - (1.5 * iqr);
  const upperFence = q3 + (1.5 * iqr);

  // 4. Filter Outliers
  const inliers = validItems.filter(i => i.val >= lowerFence && i.val <= upperFence);
  
  const mean = inliers.length > 0
    ? inliers.reduce((sum, i) => sum + i.val, 0) / inliers.length
    : 0;

  // 5. Breakdown for UI
  const breakdown: any = {};
  inputs.forEach(item => {
    if (item.val === null || item.val <= 0) {
      breakdown[item.name] = { val: null, isOutlier: false };
    } else {
      const isOutlier = item.val < lowerFence || item.val > upperFence;
      breakdown[item.name] = { 
        val: parseFloat(item.val.toFixed(1)), 
        isOutlier: isOutlier 
      };
    }
  });

  return { mean, breakdown };
}

function calculateQuartile(sorted: number[], percentile: number): number {
  const pos = (sorted.length - 1) * percentile;
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
      // 1. Fetch
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

      // 2. Prepare Inputs
      const pm25Inputs = results.map(r => ({ name: r.name, val: r.data?.pm25 || null }));
      const pm10Inputs = results.map(r => ({ name: r.name, val: r.data?.pm10 || null }));
      const ozoneInputs = results.map(r => ({ name: r.name, val: r.data?.ozone || null }));
      const methaneInputs = results.map(r => ({ name: r.name, val: r.data?.methane || null }));

      // 3. Calculate Stats 
      const statsPm25 = processDistribution(pm25Inputs);
      const statsPm10 = processDistribution(pm10Inputs);
      const statsOzone = processDistribution(ozoneInputs);
      const statsMethane = processDistribution(methaneInputs);

      // 4. Merge Breakdown for UI
      const combinedSources: Record<string, any> = {};
      results.forEach(r => {
        combinedSources[r.name] = {
          pm25: statsPm25.breakdown[r.name],
          pm10: statsPm10.breakdown[r.name],
          ozone: statsOzone.breakdown[r.name],
          methane: statsMethane.breakdown[r.name]
        };
      });

      console.log(`  ${city.name}: PM2.5 μ=${statsPm25.mean.toFixed(1)} | Ozone μ=${statsOzone.mean.toFixed(1)}`);

      // 5. Save 
      await prisma.weatherReport.create({
        data: {
          pm10: parseFloat(statsPm10.mean.toFixed(2)),
          pm25: parseFloat(statsPm25.mean.toFixed(2)),
          ozone: parseFloat(statsOzone.mean.toFixed(2)),
          methane: parseFloat(statsMethane.mean.toFixed(2)), 
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