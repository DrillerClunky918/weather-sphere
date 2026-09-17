import express from 'express';
import cors from 'cors';
import { prisma } from './src/db';

const app = express();
app.use(cors());

app.get('/api/weather', async (req, res) => {
  const data = await prisma.city.findMany({
    include: { 
      reports: { 
        take: 1, 
        orderBy: { createdAt: 'desc' } 
      } 
    }
  });
  res.json(data);
});

app.listen(3000, () => console.log("Server running on port 3000"));