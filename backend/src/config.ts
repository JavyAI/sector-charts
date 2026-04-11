import dotenv from 'dotenv';

dotenv.config();

const port = parseInt(process.env.PORT || '3000', 10);
if (isNaN(port) || port < 0 || port > 65535) {
  throw new Error(`Invalid PORT: must be 0-65535, got ${process.env.PORT}`);
}

const cacheTtlHours = parseInt(process.env.CACHE_TTL_HOURS || '24', 10);
if (isNaN(cacheTtlHours) || cacheTtlHours < 0) {
  throw new Error(`Invalid CACHE_TTL_HOURS: must be a non-negative integer, got ${process.env.CACHE_TTL_HOURS}`);
}

const rateLimitRequests = parseInt(process.env.POLYGON_RATE_LIMIT_REQUESTS || '600', 10);
if (isNaN(rateLimitRequests) || rateLimitRequests < 1) {
  throw new Error(`Invalid POLYGON_RATE_LIMIT_REQUESTS: must be a positive integer, got ${process.env.POLYGON_RATE_LIMIT_REQUESTS}`);
}

const rateLimitWindowMs = parseInt(process.env.POLYGON_RATE_LIMIT_WINDOW_MS || '60000', 10);
if (isNaN(rateLimitWindowMs) || rateLimitWindowMs < 1) {
  throw new Error(`Invalid POLYGON_RATE_LIMIT_WINDOW_MS: must be a positive integer, got ${process.env.POLYGON_RATE_LIMIT_WINDOW_MS}`);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const corsOrigin = process.env.CORS_ORIGIN || (nodeEnv === 'production' ? 'https://yourdomain.com' : 'http://localhost:5173');

export const config = {
  polygonApiKey: process.env.POLYGON_API_KEY || '',
  nodeEnv,
  port,
  databasePath: process.env.DATABASE_PATH || './data/sectors.db',
  cacheTtlHours,
  corsOrigin,
  rateLimiting: {
    requests: rateLimitRequests,
    windowMs: rateLimitWindowMs,
  },
  constituents: {
    repo: process.env.CONSTITUENTS_REPO || 'javyai/sector-data',
    filePath: process.env.CONSTITUENTS_FILE_PATH || 'constituents.csv',
    githubToken: process.env.GITHUB_TOKEN || '',
  },
};

// Validate required config
if (!config.polygonApiKey) {
  throw new Error('POLYGON_API_KEY environment variable is required');
}

export default config;
