import Database from 'better-sqlite3';
import { createConstituentsSchema } from './constituents-schema.js';
import { createShillerSchema } from './shiller-schema.js';
import { createStockPricesSchema } from './stock-prices-schema.js';

export const createSchema = (db: Database.Database) => {
  // S&P 500 constituents (GICS)
  createConstituentsSchema(db);

  // Shiller historical S&P 500 P/E data
  createShillerSchema(db);

  // Stock EOD prices and weekly returns
  createStockPricesSchema(db);

  // Daily stock fundamentals
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_fundamentals (
      id INTEGER PRIMARY KEY,
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      peRatio REAL,
      marketCap INTEGER,
      eps REAL,
      shares REAL,
      UNIQUE(symbol, date),
      FOREIGN KEY(symbol) REFERENCES constituents(symbol)
    )
  `);

  // Pre-calculated sector metrics (daily)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sector_metrics (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      sector TEXT NOT NULL,
      weightedPeRatio REAL NOT NULL,
      equalWeightPeRatio REAL NOT NULL,
      weightedMarketCap INTEGER NOT NULL,
      constituents INTEGER NOT NULL,
      lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, sector)
    )
  `);

  // Cache table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      expiresAt INTEGER NOT NULL
    )
  `);

  // Index for performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_date ON stock_fundamentals(date);
    CREATE INDEX IF NOT EXISTS idx_sector_metrics_date ON sector_metrics(date);
    CREATE INDEX IF NOT EXISTS idx_sector_metrics_sector ON sector_metrics(sector);
  `);
};
