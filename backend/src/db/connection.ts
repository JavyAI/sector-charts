import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config.js';
import { createSchema } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db: Database.Database | null = null;

export const getDatabase = (): Database.Database => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
};

export const initializeDatabase = (): void => {
  const dbPath = config.databasePath === ':memory:' || config.databasePath.startsWith('/')
    ? config.databasePath
    : path.join(process.cwd(), config.databasePath);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createSchema(db);

  // TODO: Replace with structured logger (pino, winston) for production
  console.log(`Database initialized at ${dbPath}`);
};

export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};
