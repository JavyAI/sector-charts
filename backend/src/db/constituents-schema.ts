import Database from 'better-sqlite3';

export const createConstituentsSchema = (db: Database.Database): void => {
  // Migrate: if the old schema exists (companyName column), drop and recreate
  const tableInfo = db
    .prepare("PRAGMA table_info(constituents)")
    .all() as Array<{ name: string }>;
  if (tableInfo.length > 0) {
    const hasOldSchema = tableInfo.some((col) => col.name === 'companyName');
    if (hasOldSchema) {
      db.exec('DROP TABLE IF EXISTS constituents');
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS constituents (
      symbol TEXT PRIMARY KEY,
      security TEXT,
      gics_sector TEXT,
      gics_sub_industry TEXT,
      date_added TEXT,
      cik TEXT,
      founded TEXT,
      last_updated TEXT
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_constituents_gics_sector ON constituents(gics_sector)
  `);
};
