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
let corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  if (nodeEnv === 'production') {
    throw new Error('CORS_ORIGIN environment variable is required in production');
  }
  corsOrigin = 'http://localhost:5173';
}

export const config = {
  nodeEnv,
  port,
  databasePath: process.env.DATABASE_PATH || './data/sectors.db',
  cacheTtlHours,
  corsOrigin,
  rateLimiting: {
    requests: rateLimitRequests,
    windowMs: rateLimitWindowMs,
  },
  privateDataRepo: process.env.PRIVATE_DATA_REPO || process.env.CONSTITUENTS_REPO || 'JavyAI/sector-data',
  githubToken: process.env.GITHUB_TOKEN || '',
  constituents: {
    filePath: process.env.CONSTITUENTS_FILE_PATH || 'constituents.csv',
  },
  shiller: {
    filePath: process.env.SHILLER_FILE_PATH || 'shiller.csv',
  },
};

export default config;
