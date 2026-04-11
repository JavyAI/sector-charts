import { initializeDatabase } from '../backend/src/db/connection.js';
import {
  fetchConstituentsFromGitHub,
  storeConstituents,
} from '../backend/src/services/constituents.js';

async function main() {
  try {
    initializeDatabase();

    console.log('Fetching S&P 500 constituents from GitHub...');
    const constituents = await fetchConstituentsFromGitHub();
    console.log(`Fetched ${constituents.length} constituents`);

    storeConstituents(constituents);
    console.log(`Stored/updated ${constituents.length} constituents in database`);

    process.exit(0);
  } catch (error) {
    console.error('Failed to fetch constituents:', error);
    process.exit(1);
  }
}

main();
