import express from 'express';
import cors from 'cors';
import { prisma } from './db'; // Ensure this matches your actual path

const app = express();
const PORT = 3000;

app.use(cors());

// --- ROUTES ---
app.get('/api/weather', async (req, res) => {
  try {
    const data = await prisma.city.findMany({
      include: { reports: { take: 1, orderBy: { createdAt: 'desc' } } }
    });
    res.json(data);
  } catch (e) {
    console.error("Database Error:", e);
    res.status(500).send("Database error");
  }
});

app.get('/api/proxy/trends/:cityId', async (req, res) => {
  const { cityId } = req.params;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const history = await prisma.weatherReport.findMany({
      where: { 
        cityId: Number(cityId),
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(history);
  } catch (e) {
    console.error("Trend Fetch Error:", e);
    res.status(500).json({ error: "Trend fetch failed" });
  }
});

// --- STARTUP LOGIC ---
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

// Catch unhandled promise rejections (like Prisma connection issues)
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
});