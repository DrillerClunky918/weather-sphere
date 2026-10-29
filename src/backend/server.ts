import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import { startEngine } from './engine';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- UPDATED: Replace the two origin strings with your actual deployed URLs ---
app.use(cors({
  origin: [
    'http://localhost:5173',                    // Vite dev server
    'http://localhost:3000',                    // local backend
    process.env.FRONTEND_URL ?? '',             // set this in Cloud Run env vars
  ].filter(Boolean)
}));

app.use(express.json());

app.get('/api/weather', async (req, res) => {
  const { source } = req.query;

  try {
    const data = await prisma.city.findMany({
      include: { 
        reports: { 
          take: 1, 
          orderBy: { createdAt: 'desc' } 
        } 
      }
    });

    if (source && source !== 'all') {
      const modifiedData = data.map((city: any) => {
        const latestReport = city.reports[0];
        if (!latestReport) return city;

        let parsedSources: Record<string, any> = {};
        try {
          parsedSources = typeof latestReport.sources === 'string'
            ? JSON.parse(latestReport.sources)
            : latestReport.sources || {};
        } catch (e) {
          console.error("JSON parse failure on snapshot city ID:", city.id);
        }

        const sourceData = parsedSources[String(source)];

        return {
          ...city,
          reports: [{
            ...latestReport,
            pm25: (sourceData && sourceData.pm25 && sourceData.pm25.val !== undefined) ? sourceData.pm25.val : null,
            pm10: (sourceData && sourceData.pm10 && sourceData.pm10.val !== undefined) ? sourceData.pm10.val : null
          }]
        };
      });

      return res.json(modifiedData);
    }

    res.json(data);
  } catch (e) {
    console.error("Database Error:", e);
    res.status(500).send("Database error");
  }
});

app.get('/api/proxy/trends/:cityId', async (req, res) => {
  const { cityId } = req.params;
  const { source } = req.query;
  const parsedCityId = Number(cityId);

  if (isNaN(parsedCityId)) {
    return res.status(400).json({ error: "Invalid city identification argument provided" });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const history = await prisma.weatherReport.findMany({
      where: { 
        cityId: parsedCityId,
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (source && source !== 'all') {
      const filteredHistory = history.map((report: any) => {
        let parsedSources: Record<string, any> = {};
        try {
          parsedSources = typeof report.sources === 'string' 
            ? JSON.parse(report.sources) 
            : report.sources || {};
        } catch (jsonErr) {
          console.error("JSON parse failure on report ID:", report.id);
        }

        const sourceData = parsedSources[String(source)];

        return {
          id: report.id,
          cityId: report.cityId,
          createdAt: report.createdAt,
          pm25: (sourceData && sourceData.pm25 && sourceData.pm25.val !== undefined) ? sourceData.pm25.val : null,
          pm10: (sourceData && sourceData.pm10 && sourceData.pm10.val !== undefined) ? sourceData.pm10.val : null
        };
      });

      return res.json(filteredHistory);
    }

    res.json(history);
  } catch (e) {
    console.error("Trend Fetch Error:", e);
    res.status(500).json({ error: "Trend fetch failed" });
  }
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 SERVER ONLINE`);
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`📁 File: src/backend/server.ts`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
    console.error(`Try killing the existing process or use a different port.`);
  } else {
    console.error(`\n❌ SERVER CRASHED:`, err);
  }
});

// --- UPDATED: Engine now starts from server instead of running standalone ---
startEngine();

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});
