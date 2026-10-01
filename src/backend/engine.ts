import { prisma } from './db';
import 'dotenv/config';

// --- CONFIGURATION ---
const KEYS = {
  WAQI: process.env.WAQI_TOKEN,
  OPEN_WEATHER: process.env.OPEN_WEATHER_KEY,
  WEATHER_API: process.env.WEATHER_API_KEY
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
      methane: null 
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
      methane: null 
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

// --- STATISTICAL ENGINE ---
type StatResult = {
  mean: number;
  breakdown: Record<string, { val: number | null, isOutlier: boolean }>;
};

function processDistribution(inputs: { name: string, val: number | null }[]): StatResult {
  const validItems = inputs.filter(i => i.val !== null && i.val > 0) as { name: string, val: number }[];
  
  if (validItems.length === 0) {
    const emptyBreakdown: any = {};
    inputs.forEach(i => emptyBreakdown[i.name] = { val: null, isOutlier: false });
    return { mean: 0, breakdown: emptyBreakdown };
  }

  const sorted = [...validItems].sort((a, b) => a.val - b.val);
  const values = sorted.map(i => i.val);
  
  const q1 = calculateQuartile(values, 0.25);
  const q3 = calculateQuartile(values, 0.75);
  const iqr = q3 - q1;
  
  const lowerFence = q1 - (1.5 * iqr);
  const upperFence = q3 + (1.5 * iqr);

  const inliers = validItems.filter(i => i.val >= lowerFence && i.val <= upperFence);
  
  const mean = inliers.length > 0
    ? inliers.reduce((sum, i) => sum + i.val, 0) / inliers.length
    : 0;

  const breakdown: any = {};
  inputs.forEach(item => {
    if (item.val === null || item.val <= 0) {
      breakdown[item.name] = { val: null, isOutlier: false };
    } else {
      const isOutlier = item.val < lowerFence || item.val > upperFence;
      breakdown[item.name] = { 
        val: parseFloat(item.val.toFixed(2)), 
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
  console.log(`\n[${new Date().toLocaleTimeString()}] Starting Global Standardized Update...`);
  
  try {
    const cities = await prisma.city.findMany();

    for (const city of cities) {
      const providers = [
        { name: 'Open-Meteo', fn: () => fetchOpenMeteo(city.lat, city.lng) },
        { name: 'WAQI',       fn: () => fetchWAQI(city.lat, city.lng) },
        { name: 'OpenWeather',fn: () => fetchOpenWeather(city.lat, city.lng) },
        { name: 'WeatherAPI', fn: () => fetchWeatherAPI(city.lat, city.lng) }
      ];

      const results = await Promise.all(providers.map(async (p) => {
        const val = await p.fn();
        return { name: p.name, data: val };
      }));

      // 1. Methane Normalization (Standardizing to µg/m³)
      const methaneInputs = results.map(r => {
        const raw = r.data?.methane;
        if (raw === null || raw === undefined || raw === 0) return { name: r.name, val: null };
        
        let normalized = raw;
        // If raw > 100, it's ppb . Conversion: ppb * 0.656 = µg/m³
        if (raw > 100) {
            normalized = raw * 0.656;
        } 
        // If raw < 10, it's PPM. Conversion: PPM * 656 = µg/m³
        else if (raw < 10) {
            normalized = raw * 656;
        }
        // If it's between 100 and 1000, it's likely already µg/m³ - leave it alone.

        return { name: r.name, val: normalized };
      });

      const pm25Inputs = results.map(r => ({ name: r.name, val: r.data?.pm25 || null }));
      const pm10Inputs = results.map(r => ({ name: r.name, val: r.data?.pm10 || null }));
      const ozoneInputs = results.map(r => ({ name: r.name, val: r.data?.ozone || null }));

      // 2. Calculate Outlier-Resistant Means
      const statsPm25 = processDistribution(pm25Inputs);
      const statsPm10 = processDistribution(pm10Inputs);
      const statsOzone = processDistribution(ozoneInputs);
      const statsMethane = processDistribution(methaneInputs);

      // 3. Prepare Breakdown for Tooltips
      const combinedSources: Record<string, any> = {};
      results.forEach(r => {
        combinedSources[r.name] = {
          pm25: statsPm25.breakdown[r.name],
          pm10: statsPm10.breakdown[r.name],
          ozone: statsOzone.breakdown[r.name],
          methane: statsMethane.breakdown[r.name]
        };
      });

      console.log(`  ${city.name.padEnd(15)} | Methane: ${Math.round(statsMethane.mean).toString().padStart(5)} µg/m³ | PM2.5: ${statsPm25.mean.toFixed(1)}`);

      // 4. Persistence
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
  } catch (error) { 
    console.error("Critical Engine Error:", error); 
  }
}

// Initial Run
updateWeather();

// Hourly Cycle
setInterval(updateWeather, 60 * 60 * 1000);