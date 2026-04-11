import dotenv from 'dotenv';

dotenv.config();

export const config = {
  polygonApiKey: process.env.POLYGON_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  databasePath: process.env.DATABASE_PATH || './data/sectors.db',
  cacheTtlHours: parseInt(process.env.CACHE_TTL_HOURS || '24'),
  rateLimiting: {
    requests: parseInt(process.env.POLYGON_RATE_LIMIT_REQUESTS || '600'),
    windowMs: parseInt(process.env.POLYGON_RATE_LIMIT_WINDOW_MS || '60000'),
  },
};

// Validate required config
if (!config.polygonApiKey) {
  throw new Error('POLYGON_API_KEY environment variable is required');
}

export default config;
