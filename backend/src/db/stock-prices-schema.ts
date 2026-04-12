import Database from 'better-sqlite3';

export function createStockPricesSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_prices (
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume INTEGER,
      last_updated TEXT,
      PRIMARY KEY (symbol, date)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_weekly_returns (
      symbol TEXT NOT NULL,
      week_end_date TEXT NOT NULL,
      week_start_date TEXT NOT NULL,
      return_pct REAL NOT NULL,
      close_price REAL,
      prev_close_price REAL,
      market_cap_estimate REAL,
      last_updated TEXT,
      PRIMARY KEY (symbol, week_end_date)
    )
  `);

  db.exec('CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_weekly_returns_date ON stock_weekly_returns(week_end_date)');
}
