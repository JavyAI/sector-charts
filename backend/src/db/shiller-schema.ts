import Database from 'better-sqlite3';

export const createShillerSchema = (db: Database.Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS shiller_historical (
      date TEXT PRIMARY KEY,
      sp500_price REAL,
      dividend REAL,
      earnings REAL,
      cpi REAL,
      long_rate REAL,
      real_price REAL,
      real_dividend REAL,
      real_earnings REAL,
      pe_ratio REAL,
      cape REAL,
      last_updated TEXT
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_shiller_historical_date ON shiller_historical(date)
  `);
};
