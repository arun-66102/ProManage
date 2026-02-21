import { Request, Response, Router } from 'express';
import { asyncHandler } from '../../middlewares/async.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { createWorkspaceSchema, updateWorkspaceSchema } from './workspace.schema';
import * as workspaceService from './workspace.service';

const router = Router();

// All workspace routes require authentication
router.use(authenticate);

// ─── POST /api/workspaces ────────────────────────────────

router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const data = createWorkspaceSchema.parse(req.body);
        const workspace = await workspaceService.create(data, req.user!.id);

        res.status(201).json({
            status: 'success',
            data: workspace,
        });
    })
);

// ─── GET /api/workspaces ─────────────────────────────────

router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const workspaces = await workspaceService.getAll(req.user!.id);

        res.json({
            status: 'success',
            data: workspaces,
        });
    })
);

// ─── GET /api/workspaces/:id ─────────────────────────────

router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const workspace = await workspaceService.getById(
            Number(req.params.id),
            req.user!.id
        );

        res.json({
            status: 'success',
            data: workspace,
        });
    })
);

// ─── PUT /api/workspaces/:id ─────────────────────────────

router.put(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const data = updateWorkspaceSchema.parse(req.body);
        const workspace = await workspaceService.update(
            Number(req.params.id),
            data,
            req.user!.id
        );

        res.json({
            status: 'success',
            data: workspace,
        });
    })
);

// ─── DELETE /api/workspaces/:id (Admin Only) ─────────────

router.delete(
    '/:id',
    authorize('ADMIN'),
    asyncHandler(async (req: Request, res: Response) => {
        await workspaceService.remove(Number(req.params.id));

        res.json({
            status: 'success',
            message: 'Workspace deleted successfully',
        });
    })
);

export default router;
