import { initializeDatabase, closeDatabase } from '../backend/src/db/connection.js';
import { fetchShillerData, storeShillerData, getMarketHistoricalPE } from '../backend/src/services/shiller.js';

async function main() {
  try {
    console.log('Initializing database...');
    initializeDatabase();

    console.log('Fetching Shiller historical S&P 500 data...');
    const points = await fetchShillerData();
    console.log(`Fetched ${points.length} data points.`);

    if (points.length === 0) {
      console.error('No data fetched. Aborting.');
      process.exit(1);
    }

    console.log('Storing in database...');
    storeShillerData(points);
    console.log(`Stored ${points.length} Shiller data points.`);

    // Sanity check: print a few recent stats
    const stats10y = getMarketHistoricalPE(10);
    console.log('\n10-year market P/E stats:');
    console.log(JSON.stringify(stats10y, null, 2));

    closeDatabase();
    console.log('\nDone.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to fetch Shiller data:', error);
    process.exit(1);
  }
}

main();
