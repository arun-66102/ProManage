import { NextFunction, Request, Response } from 'express';
import logger from '../config/logger';
import { ApiError } from '../utils/apiError';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
        return;
    }

    // Unexpected error
    logger.error(err);

    res.status(500).json({
        status: 'error',
        message: err.message,
        stack: err.stack,
    });
};
