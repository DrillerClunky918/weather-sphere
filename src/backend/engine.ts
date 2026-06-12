import { prisma } from './db';
import 'dotenv/config';

function getCurrentHourIndex(timeArray: string[]): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  
  const targetHourString = `${year}-${month}-${day}T${hour}:00`;
  const idx = timeArray.indexOf(targetHourString);
  return idx !== -1 ? idx : 0;
}

async function fetchWithTimeout(url: string, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function fetchOpenMeteo(lat: number, lng: number, cityName: string) {
  try {
    const cleanLat = lat.toFixed(4);
    const cleanLng = lng.toFixed(4);
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${cleanLat}&longitude=${cleanLng}&hourly=pm10,pm2_5,ozone,methane`;
    console.log(`[DEBUG Open-Meteo] Fetching for ${cityName}: ${url}`);
    const res = await fetchWithTimeout(url);
    
    if (!res.ok) {
      console.log(`[DEBUG Open-Meteo] HTTP Error for ${cityName}: Status ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (!data.hourly || !data.hourly.time) {
      console.log(`[DEBUG Open-Meteo] Malformed JSON payload structure for ${cityName}`);
      return null;
    }

    const idx = getCurrentHourIndex(data.hourly.time);
    console.log(`[DEBUG Open-Meteo] Target Hour String matched at index ${idx} for ${cityName}`);

    const result = {
      pm25: data.hourly.pm2_5?.[idx] ?? null,
      pm10: data.hourly.pm10?.[idx] ?? null,
      ozone: data.hourly.ozone?.[idx] ?? null,
      methane: data.hourly.methane?.[idx] ?? null
    };

    console.log(`[DEBUG Open-Meteo] Parsed metrics for ${cityName}:`, result);
    return result;
  } catch (e: any) {
    console.log(`[DEBUG Open-Meteo] Exception caught for ${cityName}: ${e.message}`);
    return null;
  }
}

async function fetchWAQI(lat: number, lng: number, cityName: string) {
  if (!process.env.WAQI_TOKEN) {
    console.log(`[DEBUG WAQI] Missing WAQI_TOKEN environment variable for ${cityName}`);
    return null;
  }
  try {
    const url = `https://api.waqi.info/feed/geo:${lat.toFixed(4)};${lng.toFixed(4)}/?token=${process.env.WAQI_TOKEN}`;
    console.log(`[DEBUG WAQI] Fetching for ${cityName}: ${url}`);
    const res = await fetchWithTimeout(url);
    const data = await res.json();
    
    if (data.status !== 'ok') {
      console.log(`[DEBUG WAQI] API response status failed for ${cityName}: ${data.data}`);
      return null;
    }
    
    const iaqi = data.data.iaqi;
    const result = {
      pm25: iaqi?.pm25?.v ?? null,
      pm10: iaqi?.pm10?.v ?? null,
      ozone: iaqi?.o3?.v ?? null,
      methane: null
    };

    console.log(`[DEBUG WAQI] Parsed metrics for ${cityName}:`, result);
    return result;
  } catch (e: any) {
    console.log(`[DEBUG WAQI] Exception caught for ${cityName}: ${e.message}`);
    return null;
  }
}

async function fetchOpenWeather(lat: number, lng: number, cityName: string) {
  if (!process.env.OPEN_WEATHER_KEY) {
    console.log(`[DEBUG OpenWeather] Missing OPEN_WEATHER_KEY environment variable for ${cityName}`);
    return null;
  }
  try {
    const url = `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&appid=${process.env.OPEN_WEATHER_KEY}`;
    console.log(`[DEBUG OpenWeather] Fetching for ${cityName}: ${url}`);
    const res = await fetchWithTimeout(url);
    
    if (!res.ok) {
      console.log(`[DEBUG OpenWeather] HTTP Error for ${cityName}: Status ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    const comps = data.list[0].components;
    const result = {
      pm25: comps.pm2_5 ?? null,
      pm10: comps.pm10 ?? null,
      ozone: comps.o3 ?? null,
      methane: null
    };

    console.log(`[DEBUG OpenWeather] Parsed metrics for ${cityName}:`, result);
    return result;
  } catch (e: any) {
    console.log(`[DEBUG OpenWeather] Exception caught for ${cityName}: ${e.message}`);
    return null;
  }
}

async function fetchWeatherAPI(lat: number, lng: number, cityName: string) {
  if (!process.env.WEATHER_API_KEY) {
    console.log(`[DEBUG WeatherAPI] Missing WEATHER_API_KEY environment variable for ${cityName}`);
    return null;
  }
  try {
    const url = `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${lat.toFixed(4)},${lng.toFixed(4)}&aqi=yes`;
    console.log(`[DEBUG WeatherAPI] Fetching for ${cityName}: ${url}`);
    const res = await fetchWithTimeout(url);
    
    if (!res.ok) {
      console.log(`[DEBUG WeatherAPI] HTTP Error for ${cityName}: Status ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    const air = data.current?.air_quality;
    if (!air) {
      console.log(`[DEBUG WeatherAPI] Missing air_quality node payload fields for ${cityName}`);
      return null;
    }
    
    const result = {
      pm25: air.pm2_5 ?? null,
      pm10: air.pm10 ?? null,
      ozone: air.o3 ?? null,
      methane: air.ch4 ?? null
    };

    console.log(`[DEBUG WeatherAPI] Parsed metrics for ${cityName}:`, result);
    return result;
  } catch (e: any) {
    console.log(`[DEBUG WeatherAPI] Exception caught for ${cityName}: ${e.message}`);
    return null;
  }
}

type StatResult = {
  mean: number;
  breakdown: Record<string, { val: number | null, isOutlier: boolean }>;
};

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

function processDistribution(inputs: { name: string, val: number | null }[]): StatResult {
  const validItems = inputs.filter(i => i.val !== null && i.val >= 0) as { name: string, val: number }[];
  
  if (validItems.length === 0) {
    const emptyBreakdown: Record<string, { val: number | null, isOutlier: boolean }> = {};
    inputs.forEach(i => {
      emptyBreakdown[i.name] = { val: null, isOutlier: false };
    });
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
    : validItems.reduce((sum, i) => sum + i.val, 0) / validItems.length;

  const breakdown: Record<string, { val: number | null, isOutlier: boolean }> = {};
  inputs.forEach(item => {
    if (item.val === null || item.val < 0) {
      breakdown[item.name] = { val: null, isOutlier: false };
    } else {
      const isOutlier = item.val < lowerFence || item.val > upperFence;
      breakdown[item.name] = { 
        val: parseFloat(item.val.toFixed(2)), 
        boxIsOutlier: isOutlier 
      };
    }
  });

  return { mean, breakdown };
}

async function updateWeather() {
  console.log("🎬 Syncing PM2.5 and PM10 using IQR filter engines...");
  try {
    const cities = await prisma.city.findMany();
    for (const city of cities) {
      console.log(`\n--- Processing Station Data Sync Block: ${city.name} ---`);
      
      const results = await Promise.all([
        fetchOpenMeteo(city.lat, city.lng, city.name),
        fetchWAQI(city.lat, city.lng, city.name),
        fetchOpenWeather(city.lat, city.lng, city.name),
        fetchWeatherAPI(city.lat, city.lng, city.name)
      ]);

      const providers = ['Open-Meteo', 'WAQI', 'OpenWeather', 'WeatherAPI'];
      const compiled = providers.map((name, i) => ({ name, data: results[i] }));

      const methaneInputs = compiled.map(r => {
        const raw = r.data?.methane;
        if (raw === null || raw === undefined || raw === 0) return { name: r.name, val: null };
        
        let normalized = raw;
        if (r.name === 'Open-Meteo') {
          normalized = raw / 1000;
        } 
        return { name: r.name, val: normalized };
      });

      const ozoneInputs = compiled.map(r => {
        const raw = r.data?.ozone;
        if (raw === null || raw === undefined || raw === 0) return { name: r.name, val: null };

        let normalized = raw;
        if (r.name === 'Open-Meteo') {
          normalized = (raw * 0.51) / 1000; 
        } else {
          normalized = raw / 1000;
        }
        return { name: r.name, val: normalized };
      });

      const pm25Inputs = compiled.map(r => ({ name: r.name, val: r.data?.pm25 ?? null }));
      const pm10Inputs = compiled.map(r => ({ name: r.name, val: r.data?.pm10 ?? null }));

      const statsPm25 = processDistribution(pm25Inputs);
      const statsPm10 = processDistribution(pm10Inputs);
      const statsOzone = processDistribution(ozoneInputs);
      const statsMethane = processDistribution(methaneInputs);

      const combinedSources: Record<string, any> = {};
      providers.forEach(name => {
        combinedSources[name] = {
          pm25: statsPm25.breakdown[name],
          pm10: statsPm10.breakdown[name],
          ozone: statsOzone.breakdown[name],
          methane: statsMethane.breakdown[name]
        };
      });

      console.log(`[DEBUG SYNCHRONIZER] IQR Breakdown Constructed for ${city.name}:`, JSON.stringify(combinedSources));

      await prisma.weatherReport.create({
        data: {
          city: {
            connect: { id: city.id }
          },
          pm25: statsPm25.mean > 0 ? parseFloat(statsPm25.mean.toFixed(2)) : null,
          pm10: statsPm10.mean > 0 ? parseFloat(statsPm10.mean.toFixed(2)) : null,
          sources: JSON.stringify(combinedSources)
        }
      });
      await new Promise(r => setTimeout(r, 50));
    }
    console.log("\n🏁 Database updated mapping complete.");
  } catch (error) { console.error(error); }
}

updateWeather();
setInterval(updateWeather, 60 * 60 * 1000);