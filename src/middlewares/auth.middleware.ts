import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Verifies the JWT access token from the Authorization header.
 * Attaches decoded user info to req.user.
 */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
            id: number;
            email: string;
            role: string;
        };

        req.user = decoded;
        next();
    } catch {
        throw ApiError.unauthorized('Invalid or expired token');
    }
};
