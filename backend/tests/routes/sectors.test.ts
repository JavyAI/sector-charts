import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import { createSchema } from '../../src/db/schema.js';

let testDb: Database.Database;

// Set up in-memory db before mocking
testDb = new Database(':memory:');
createSchema(testDb);

vi.mock('../../src/db/connection.js', () => ({
  getDatabase: () => testDb,
  initializeDatabase: vi.fn(),
  closeDatabase: vi.fn(),
}));

// Import router AFTER mocking
const { default: sectorsRouter } = await import('../../src/routes/sectors.js');

const app = express();
app.use(express.json());
app.use('/api/sectors', sectorsRouter);

describe('GET /api/sectors', () => {
  it('returns 404 when no data available for a date', async () => {
    const res = await request(app).get('/api/sectors?date=2000-01-01');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for invalid date format', async () => {
    const res = await request(app).get('/api/sectors?date=not-a-date');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when date query param is missing', async () => {
    const res = await request(app).get('/api/sectors');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
