import { Request, Response, Router } from 'express';
import { asyncHandler } from '../../middlewares/async.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { createProjectSchema, updateProjectSchema } from './project.schema';
import * as projectService from './project.service';

const router = Router();

router.use(authenticate);

// ─── POST /api/projects ──────────────────────────────────

router.post(
    '/',
    authorize('ADMIN', 'MANAGER'),
    asyncHandler(async (req: Request, res: Response) => {
        const data = createProjectSchema.parse(req.body);
        const project = await projectService.create(data);

        res.status(201).json({
            status: 'success',
            data: project,
        });
    })
);

// ─── GET /api/projects?workspaceId=1 ─────────────────────

router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const workspaceId = Number(req.query.workspaceId);

        if (!workspaceId) {
            res.status(400).json({ status: 'error', message: 'workspaceId query param is required' });
            return;
        }

        const projects = await projectService.getByWorkspace(workspaceId);

        res.json({
            status: 'success',
            data: projects,
        });
    })
);

// ─── GET /api/projects/:id ───────────────────────────────

router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const project = await projectService.getById(Number(req.params.id));

        res.json({
            status: 'success',
            data: project,
        });
    })
);

// ─── PUT /api/projects/:id ───────────────────────────────

router.put(
    '/:id',
    authorize('ADMIN', 'MANAGER'),
    asyncHandler(async (req: Request, res: Response) => {
        const data = updateProjectSchema.parse(req.body);
        const project = await projectService.update(Number(req.params.id), data);

        res.json({
            status: 'success',
            data: project,
        });
    })
);

// ─── DELETE /api/projects/:id (Transactional) ────────────

router.delete(
    '/:id',
    authorize('ADMIN', 'MANAGER'),
    asyncHandler(async (req: Request, res: Response) => {
        await projectService.remove(Number(req.params.id), req.user!.email);

        res.json({
            status: 'success',
            message: 'Project and all associated tasks deleted',
        });
    })
);

export default router;
