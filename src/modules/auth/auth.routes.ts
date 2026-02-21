import { Request, Response, Router } from 'express';
import { asyncHandler } from '../../middlewares/async.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { ApiError } from '../../utils/apiError';
import { loginSchema, registerSchema } from './auth.schema';
import * as authService from './auth.service';

const router = Router();

// ─── POST /api/auth/register ─────────────────────────────

router.post(
    '/register',
    asyncHandler(async (req: Request, res: Response) => {
        const data = registerSchema.parse(req.body);
        const result = await authService.register(data);

        res.status(201).json({
            status: 'success',
            message: 'User registered successfully',
            data: {
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    })
);

// ─── POST /api/auth/login ────────────────────────────────

router.post(
    '/login',
    asyncHandler(async (req: Request, res: Response) => {
        const data = loginSchema.parse(req.body);
        const result = await authService.login(data);

        res.json({
            status: 'success',
            message: 'Login successful',
            data: {
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
            },
        });
    })
);

// ─── POST /api/auth/refresh ──────────────────────────────

router.post(
    '/refresh',
    asyncHandler(async (req: Request, res: Response) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            throw ApiError.badRequest('Refresh token is required');
        }

        const result = await authService.refreshAccessToken(refreshToken);

        res.json({
            status: 'success',
            data: result,
        });
    })
);

// ─── POST /api/auth/logout ───────────────────────────────

router.post(
    '/logout',
    authenticate,
    asyncHandler(async (req: Request, res: Response) => {
        await authService.logout(req.user!.id);

        res.json({
            status: 'success',
            message: 'Logged out successfully',
        });
    })
);

export default router;
