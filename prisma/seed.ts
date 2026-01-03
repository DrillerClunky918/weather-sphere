import { prisma } from '../src/db';

const cities = [
  // --- 12 MAJOR HUBS ---
  { name: "New York City", state: "NY", lat: 40.71, lng: -74.01 },
  { name: "Los Angeles", state: "CA", lat: 34.05, lng: -118.24 },
  { name: "Chicago", state: "IL", lat: 41.88, lng: -87.63 },
  { name: "Houston", state: "TX", lat: 29.76, lng: -95.37 },
  { name: "Philadelphia", state: "PA", lat: 39.95, lng: -75.17 },
  { name: "San Antonio", state: "TX", lat: 29.42, lng: -98.49 },
  { name: "San Diego", state: "CA", lat: 32.72, lng: -117.16 },
  { name: "Dallas", state: "TX", lat: 32.78, lng: -96.80 },
  { name: "San Jose", state: "CA", lat: 37.34, lng: -121.89 },
  { name: "Fort Worth", state: "TX", lat: 32.75, lng: -97.33 },
  { name: "Jacksonville", state: "FL", lat: 30.33, lng: -81.65 },
  { name: "Charlotte", state: "NC", lat: 35.22, lng: -80.84 },

  // --- 50 STATE CAPITALS ---
  { name: "Montgomery", state: "AL", lat: 32.37, lng: -86.30 },
  { name: "Juneau", state: "AK", lat: 58.30, lng: -134.42 },
  { name: "Phoenix", state: "AZ", lat: 33.45, lng: -112.07 },
  { name: "Little Rock", state: "AR", lat: 34.74, lng: -92.28 },
  { name: "Sacramento", state: "CA", lat: 38.58, lng: -121.49 },
  { name: "Denver", state: "CO", lat: 39.74, lng: -104.99 },
  { name: "Hartford", state: "CT", lat: 41.76, lng: -72.67 },
  { name: "Dover", state: "DE", lat: 39.15, lng: -75.52 },
  { name: "Tallahassee", state: "FL", lat: 30.44, lng: -84.28 },
  { name: "Atlanta", state: "GA", lat: 33.75, lng: -84.39 },
  { name: "Honolulu", state: "HI", lat: 21.31, lng: -157.86 },
  { name: "Boise", state: "ID", lat: 43.61, lng: -116.20 },
  { name: "Springfield", state: "IL", lat: 39.78, lng: -89.65 },
  { name: "Indianapolis", state: "IN", lat: 39.76, lng: -86.15 },
  { name: "Des Moines", state: "IA", lat: 41.58, lng: -93.61 },
  { name: "Topeka", state: "KS", lat: 39.05, lng: -95.67 },
  { name: "Frankfort", state: "KY", lat: 38.20, lng: -84.87 },
  { name: "Baton Rouge", state: "LA", lat: 30.45, lng: -91.18 },
  { name: "Augusta", state: "ME", lat: 44.31, lng: -69.77 },
  { name: "Annapolis", state: "MD", lat: 38.97, lng: -76.49 },
  { name: "Boston", state: "MA", lat: 42.36, lng: -71.06 },
  { name: "Lansing", state: "MI", lat: 42.73, lng: -84.55 },
  { name: "Saint Paul", state: "MN", lat: 44.95, lng: -93.09 },
  { name: "Jackson", state: "MS", lat: 32.29, lng: -90.18 },
  { name: "Jefferson City", state: "MO", lat: 38.57, lng: -92.17 },
  { name: "Helena", state: "MT", lat: 46.58, lng: -112.02 },
  { name: "Lincoln", state: "NE", lat: 40.81, lng: -96.70 },
  { name: "Carson City", state: "NV", lat: 39.16, lng: -119.76 },
  { name: "Concord", state: "NH", lat: 43.20, lng: -71.53 },
  { name: "Trenton", state: "NJ", lat: 40.22, lng: -74.75 },
  { name: "Santa Fe", state: "NM", lat: 35.68, lng: -105.93 },
  { name: "Albany", state: "NY", lat: 42.65, lng: -73.75 },
  { name: "Raleigh", state: "NC", lat: 35.77, lng: -78.63 },
  { name: "Bismarck", state: "ND", lat: 46.80, lng: -100.78 },
  { name: "Columbus", state: "OH", lat: 39.96, lng: -82.99 },
  { name: "Oklahoma City", state: "OK", lat: 35.46, lng: -97.51 },
  { name: "Salem", state: "OR", lat: 44.94, lng: -123.03 },
  { name: "Harrisburg", state: "PA", lat: 40.27, lng: -76.88 },
  { name: "Providence", state: "RI", lat: 41.82, lng: -71.41 },
  { name: "Columbia", state: "SC", lat: 34.00, lng: -81.03 },
  { name: "Pierre", state: "SD", lat: 44.36, lng: -100.35 },
  { name: "Nashville", state: "TN", lat: 36.16, lng: -86.78 },
  { name: "Austin", state: "TX", lat: 30.27, lng: -97.74 },
  { name: "Salt Lake City", state: "UT", lat: 40.76, lng: -111.89 },
  { name: "Montpelier", state: "VT", lat: 44.26, lng: -72.57 },
  { name: "Richmond", state: "VA", lat: 37.54, lng: -77.44 },
  { name: "Olympia", state: "WA", lat: 47.03, lng: -122.90 },
  { name: "Charleston", state: "WV", lat: 38.34, lng: -81.63 },
  { name: "Madison", state: "WI", lat: 43.07, lng: -89.40 },
  { name: "Cheyenne", state: "WY", lat: 41.14, lng: -104.82 }
];

async function main() {
  console.log(`🌱 Seeding ${cities.length} cities...`);
  
  // Clear old data so we don't get duplicates or "Unique constraint" errors
  await prisma.weatherReport.deleteMany(); // Delete reports first (foreign key)
  await prisma.city.deleteMany();          // Then delete cities

  for (const city of cities) {
    await prisma.city.create({
      data: {
        name: city.name,
        state: city.state,
        lat: city.lat,
        lng: city.lng,
      }
    });
  }
  console.log("✅ Seeding complete.");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());