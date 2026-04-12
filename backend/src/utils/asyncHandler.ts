import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncRouteHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      Promise.resolve(fn(req, res, next)).catch(next);
    } catch (err) {
      next(err);
    }
  };
