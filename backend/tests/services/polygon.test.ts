import { describe, it, expect, beforeAll } from 'vitest';

// Set required env vars before importing modules that read config at load time
process.env.POLYGON_API_KEY = 'test-api-key';

import { PolygonService } from '../../src/services/polygon.js';

describe('PolygonService', () => {
  let service: PolygonService;

  beforeAll(() => {
    service = new PolygonService();
  });

  it('should instantiate', () => {
    expect(service).toBeDefined();
  });
});
