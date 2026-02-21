import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/apiError';

/**
 * Role-Based Access Control middleware.
 * Checks if the authenticated user has one of the allowed roles.
 *
 * Usage: authorize('ADMIN', 'MANAGER')
 */
export const authorize = (...allowedRoles: string[]) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        if (!req.user) {
            throw ApiError.unauthorized('Authentication required');
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw ApiError.forbidden(
                `Role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`
            );
        }

        next();
    };
};
