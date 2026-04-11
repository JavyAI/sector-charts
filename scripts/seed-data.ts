import { initializeDatabase, getDatabase } from '../backend/src/db/connection.js';
import { sectorService } from '../backend/src/services/sector.js';
import { StockFundamental } from '../backend/src/types.js';

const MOCK_DATA: Record<string, StockFundamental[]> = {
  Technology: [
    {
      symbol: 'AAPL',
      companyName: 'Apple',
      marketCap: 3000000000000,
      peRatio: 30,
      eps: 6,
      shares: 500000000,
    },
    {
      symbol: 'MSFT',
      companyName: 'Microsoft',
      marketCap: 2500000000000,
      peRatio: 35,
      eps: 10,
      shares: 250000000,
    },
  ],
  Financials: [
    {
      symbol: 'JPM',
      companyName: 'JPMorgan Chase',
      marketCap: 600000000000,
      peRatio: 15,
      eps: 20,
      shares: 2800000000,
    },
  ],
  Energy: [
    {
      symbol: 'XOM',
      companyName: 'ExxonMobil',
      marketCap: 450000000000,
      peRatio: 12,
      eps: 8,
      shares: 1700000000,
    },
  ],
};

async function seedData() {
  try {
    await initializeDatabase();

    const today = new Date().toISOString().split('T')[0];

    const allMetrics = Object.entries(MOCK_DATA).map(([sector, stocks]) =>
      sectorService.aggregateToSector(today, sector, stocks)
    );

    await sectorService.storeSectorMetrics(allMetrics);

    console.log(`✅ Seeded ${allMetrics.length} sectors with mock data`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
