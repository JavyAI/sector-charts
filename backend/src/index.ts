import config from './config.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './db/connection.js';
import sectorsRouter from './routes/sectors.js';
import constituentsRouter from './routes/constituents.js';
import shillerRouter from './routes/shiller.js';
import stockPricesRouter from './routes/stockPrices.js';
import subSectorsRouter from './routes/subSectors.js';
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
app.use('/api/shiller', shillerRouter);
app.use('/api/stock-prices', stockPricesRouter);
app.use('/api/sub-sectors', subSectorsRouter);

// Serve frontend static files (production build)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA catch-all: serve index.html for any non-API route
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/health') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

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
