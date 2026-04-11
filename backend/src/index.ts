import config from './config.js';
import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db/connection.js';

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
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes will be added in subsequent tasks
app.use('/api/sectors', (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
