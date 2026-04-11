import { describe, it, expect, beforeAll, vi, afterEach } from 'vitest';
import axios from 'axios';
import { PolygonService } from '../../src/services/polygon.js';

vi.mock('axios');

describe('PolygonService', () => {
  let service: PolygonService;

  beforeAll(() => {
    process.env.POLYGON_API_KEY = 'test-api-key';
    service = new PolygonService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should instantiate', () => {
    expect(service).toBeDefined();
  });

  it('should return empty array on S&P 500 constituents error', async () => {
    (axios.get as any).mockRejectedValueOnce(new Error('Network error'));
    const result = await service.getSP500Constituents();
    expect(result).toEqual([]);
  });

  it('should parse S&P 500 constituents as array of ticker strings', async () => {
    (axios.get as any).mockResolvedValueOnce({
      data: { results: [{ ticker: 'AAPL' }, { symbol: 'MSFT' }] }
    });
    const result = await service.getSP500Constituents();
    expect(result).toEqual(['AAPL', 'MSFT']);
  });

  it('should include apikey param in all requests', async () => {
    (axios.get as any).mockResolvedValueOnce({ data: { results: [] } });
    await service.getSP500Constituents();
    const call = (axios.get as any).mock.calls[0];
    expect(call[1].params).toHaveProperty('apikey', 'test-api-key');
  });
});
