import { prisma } from '../db';

const ONE_HOUR = 60 * 60 * 1000; 

async function updateWeather() {
  console.log(`[${new Date().toLocaleTimeString()}] Starting AQI update...`);
  
  try {
    const cities = await prisma.city.findMany();

    for (const city of cities) {
      try {
        const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lng}&hourly=us_aqi`;
        
        const aqRes = await fetch(aqUrl);
        const aqData = await aqRes.json();
        const currentAqi = aqData.hourly.us_aqi[0]; 

        await prisma.weatherReport.create({
          data: {
            aqi: currentAqi,
            temp: 0, 
            cityId: city.id,
            timestamp: new Date()
          }
        });
      } catch (e) {
        console.error(`Skipped ${city.name}`);
      }
    }
    console.log("Update Complete.");
  } catch (error) {
    console.error("Engine Error:", error);
  }
}

updateWeather();
setInterval(updateWeather, ONE_HOUR);