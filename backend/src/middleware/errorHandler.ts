import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';
import { config } from '../config.js';

export const errorHandler = (err: Error & { statusCode?: number }, req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({ err, statusCode, path: req.path, method: req.method }, 'Request error');

  res.status(statusCode).json({
    error: message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};
