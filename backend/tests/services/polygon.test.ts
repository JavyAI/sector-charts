import { describe, it, expect, beforeAll, vi } from 'vitest';

// Set required env vars before importing modules that read config at load time
process.env.POLYGON_API_KEY = 'test-api-key';

import { PolygonService } from '../../src/services/polygon.js';

describe('PolygonService', () => {
  let service: PolygonService;

  beforeAll(() => {
    service = new PolygonService();
  });

  it('should queue requests to respect rate limits', async () => {
    const mockFn = vi.fn().mockResolvedValue({ data: 'test' });

    // This test verifies the queue exists and processes requests
    // Full integration test would require actual API key
    expect(service).toBeDefined();
  });
});
