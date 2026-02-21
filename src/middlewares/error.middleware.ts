import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
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
        message: 'Internal server error',
        ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
