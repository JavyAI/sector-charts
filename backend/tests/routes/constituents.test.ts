import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createSchema } from '../../src/db/schema.js';

let testDb: Database.Database;

testDb = new Database(':memory:');
createSchema(testDb);

vi.mock('../../src/db/connection.js', () => ({
  getDatabase: () => testDb,
  initializeDatabase: vi.fn(),
  closeDatabase: vi.fn(),
}));

const { default: constituentsRouter } = await import('../../src/routes/constituents.js');

const app = express();
app.use(express.json());
app.use('/api/constituents', constituentsRouter);

describe('GET /api/constituents/sector/:sector', () => {
  it('returns 400 for an invalid GICS sector name', async () => {
    const res = await request(app).get('/api/constituents/sector/InvalidSector');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toMatch(/Invalid GICS sector/);
  });

  it('returns 200 with empty array for a valid sector with no data', async () => {
    const res = await request(app).get('/api/constituents/sector/Energy');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sector', 'Energy');
    expect(res.body).toHaveProperty('count', 0);
    expect(res.body.constituents).toEqual([]);
  });

  it('returns all valid GICS sectors without error', async () => {
    const validSectors = [
      'Information Technology',
      'Financials',
      'Health Care',
      'Consumer Discretionary',
      'Communication Services',
      'Industrials',
      'Consumer Staples',
      'Energy',
      'Utilities',
      'Real Estate',
      'Materials',
    ];
    for (const sector of validSectors) {
      const res = await request(app).get(`/api/constituents/sector/${encodeURIComponent(sector)}`);
      expect(res.status).toBe(200);
    }
  });
});
