import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const globalHubs = [
  { name: 'New York City', state: 'NY', lat: 40.71, lng: -74.01 },
  { name: 'London', state: 'ENG', lat: 51.51, lng: -0.13 },
  { name: 'Tokyo', state: 'TYO', lat: 35.68, lng: 139.69 },
  { name: 'Singapore', state: 'SG', lat: 1.35, lng: 103.82 },
  { name: 'Paris', state: 'IDF', lat: 48.86, lng: 2.35 },
  { name: 'Sydney', state: 'NSW', lat: -33.87, lng: 151.21 },
  { name: 'Mumbai', state: 'MH', lat: 19.07, lng: 72.88 },
  { name: 'Cairo', state: 'CRA', lat: 30.04, lng: 31.24 },
  { name: 'São Paulo', state: 'SP', lat: -23.55, lng: -46.63 },
  { name: 'Cape Town', state: 'WC', lat: -33.93, lng: 18.42 }
];

async function main() {
  console.log('🧹 Purging old weather reports and city nodes...');
  // Wipe dependent tracking reports first to safely break SQLite relations
  await prisma.weatherReport.deleteMany({});
  await prisma.city.deleteMany({});

  console.log(`🌱 Seeding ${globalHubs.length} international hubs into SQLite database...`);

  for (const hub of globalHubs) {
    const city = await prisma.city.create({
      data: {
        name: hub.name,
        state: hub.state,
        lat: hub.lat,
        lng: hub.lng,
      }
    });

    // Create a matching initial baseline calculation report for each node
    await prisma.weatherReport.create({
      data: {
        cityId: city.id,
        // Generates safe random baseline numbers between 5 and 25
        pm25: parseFloat((Math.random() * 15 + 5).toFixed(2)),
        pm10: parseFloat((Math.random() * 20 + 10).toFixed(2)),
        // Setup matching JSON structure strings to keep frontend metrics parsers happy
        sources: JSON.stringify({
          "Open-Meteo": { val: Math.random() * 15 + 5, isOutlier: false },
          "WAQI": { val: Math.random() * 15 + 5, isOutlier: false },
          "OpenWeather": { val: Math.random() * 15 + 5, isOutlier: false },
          "WeatherAPI": { val: Math.random() * 15 + 5, isOutlier: false }
        })
      }
    });
  }

  console.log('✅ Global seed execution successfully completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });