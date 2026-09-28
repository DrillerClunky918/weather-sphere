import express from 'express';
import cors from 'cors';
import { prisma } from './src/db';

const app = express();
app.use(cors());

// --- 1. HIGHLY GENERAL ENDPOINT  ---
// This handles any combination of city, date ranges, and sorting.
app.get('/api/reports/search', async (req, res) => {
  const { cityId, from, to, limit, order } = req.query;

  try {
    const reports = await prisma.weatherReport.findMany({
      where: {
        cityId: cityId ? Number(cityId) : undefined,
        createdAt: {
          gte: from ? new Date(from as string) : undefined,
          lte: to ? new Date(to as string) : undefined,
        },
      },
      take: limit ? Number(limit) : 100,
      orderBy: { createdAt: order === 'asc' ? 'asc' : 'desc' },
      include: { city: true },
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

// --- 2. PURPOSE-BUILT PROXIES (Convenience Endpoints) ---

// Current Table/Dashboard View: Proxy that only gets the latest status for all cities
app.get('/api/weather', async (req, res) => {
  try {
    const data = await prisma.city.findMany({
      include: {
        reports: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    res.json(data);
  } catch (e) {
    res.status(500).send("Database error");
  }
});

// Trend Proxy: Serves a specific "Plot" or Chart component
app.get('/api/proxy/trends/:cityId', async (req, res) => {
  const { cityId } = req.params;
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const history = await prisma.weatherReport.findMany({
    where: { 
      cityId: Number(cityId),
      createdAt: { gte: last24Hours }
    },
    select: { createdAt: true, pm25: true, ozone: true }, =
    orderBy: { createdAt: 'asc' }
  });
  res.json(history);
});

app.listen(3000, () => console.log("Server running on port 3000"));