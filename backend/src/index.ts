import config from './config.js';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/connection.js';
import sectorsRouter from './routes/sectors.js';
import constituentsRouter from './routes/constituents.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './logger.js';

const app = express();
const PORT = config.port;

// Middleware
app.use(cors({
  origin: config.corsOrigin,
}));
app.use(express.json());

// Initialize database
try {
  initializeDatabase();
} catch (error) {
  logger.error({ err: error }, 'Failed to initialize database');
  process.exit(1);
}

// Health check — Railway uses this endpoint as its healthcheck target (see railway.json)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/sectors', sectorsRouter);
app.use('/api/constituents', constituentsRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on 0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
