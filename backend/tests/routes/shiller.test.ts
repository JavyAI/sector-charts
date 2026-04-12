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

const { default: shillerRouter } = await import('../../src/routes/shiller.js');

const app = express();
app.use(express.json());
app.use('/api/shiller', shillerRouter);

describe('GET /api/shiller/market-pe', () => {
  it('returns 400 for an invalid years parameter', async () => {
    const res = await request(app).get('/api/shiller/market-pe?years=abc');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for years=0', async () => {
    const res = await request(app).get('/api/shiller/market-pe?years=0');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 200 with stats shape for years=10 (empty db returns zeroed stats)', async () => {
    const res = await request(app).get('/api/shiller/market-pe?years=10');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('median');
    expect(res.body.stats).toHaveProperty('mean');
    expect(res.body.stats).toHaveProperty('min');
    expect(res.body.stats).toHaveProperty('max');
  });

  it('returns 200 with years=ALL', async () => {
    const res = await request(app).get('/api/shiller/market-pe?years=ALL');
    expect(res.status).toBe(200);
    expect(res.body.years).toBe('ALL');
  });
});

describe('GET /api/shiller/history', () => {
  it('returns 400 when start date is missing', async () => {
    const res = await request(app).get('/api/shiller/history?end=2024-01-01');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when end date is missing', async () => {
    const res = await request(app).get('/api/shiller/history?start=2024-01-01');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when start > end', async () => {
    const res = await request(app).get('/api/shiller/history?start=2024-06-01&end=2024-01-01');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 200 with data shape for a valid range', async () => {
    const res = await request(app).get('/api/shiller/history?start=2020-01-01&end=2020-12-31');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('start', '2020-01-01');
    expect(res.body).toHaveProperty('end', '2020-12-31');
    expect(res.body).toHaveProperty('count');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
