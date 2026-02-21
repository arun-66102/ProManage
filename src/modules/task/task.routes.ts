import { Request, Response, Router } from 'express';
import { asyncHandler } from '../../middlewares/async.middleware';
import { authenticate } from '../../middlewares/auth.middleware';
import { authorize } from '../../middlewares/rbac.middleware';
import { createTaskSchema, updateTaskSchema } from './task.schema';
import * as taskService from './task.service';

const router = Router();

router.use(authenticate);

// ─── POST /api/tasks ─────────────────────────────────────

router.post(
    '/',
    authorize('ADMIN', 'MANAGER'),
    asyncHandler(async (req: Request, res: Response) => {
        const data = createTaskSchema.parse(req.body);
        const task = await taskService.create(data, req.user!.email);

        res.status(201).json({
            status: 'success',
            data: task,
        });
    })
);

// ─── GET /api/tasks?projectId=1 ──────────────────────────

router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const projectId = Number(req.query.projectId);

        if (!projectId) {
            res.status(400).json({ status: 'error', message: 'projectId query param is required' });
            return;
        }

        const tasks = await taskService.getByProject(projectId);

        res.json({
            status: 'success',
            data: tasks,
        });
    })
);

// ─── GET /api/tasks/me ───────────────────────────────────
// Returns all tasks assigned to the current user across all workspaces

router.get(
    '/me',
    asyncHandler(async (req: Request, res: Response) => {
        const tasks = await taskService.getMyTasks(req.user!.id);

        res.json({
            status: 'success',
            data: tasks,
        });
    })
);

// ─── GET /api/tasks/:id ──────────────────────────────────

router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const task = await taskService.getById(Number(req.params.id));

        res.json({
            status: 'success',
            data: task,
        });
    })
);

// ─── PATCH /api/tasks/:id ────────────────────────────────
// Members can update status; Managers/Admins can update anything

router.patch(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
        const data = updateTaskSchema.parse(req.body);

        // Members can only update status
        if (req.user!.role === 'MEMBER') {
            const allowedKeys = ['status'];
            const attemptedKeys = Object.keys(data);
            const forbidden = attemptedKeys.filter((k) => !allowedKeys.includes(k));

            if (forbidden.length > 0) {
                res.status(403).json({
                    status: 'error',
                    message: `Members can only update: ${allowedKeys.join(', ')}. Cannot update: ${forbidden.join(', ')}`,
                });
                return;
            }
        }

        const task = await taskService.update(Number(req.params.id), data, req.user!.email);

        res.json({
            status: 'success',
            data: task,
        });
    })
);

// ─── DELETE /api/tasks/:id ───────────────────────────────

router.delete(
    '/:id',
    authorize('ADMIN', 'MANAGER'),
    asyncHandler(async (req: Request, res: Response) => {
        await taskService.remove(Number(req.params.id));

        res.json({
            status: 'success',
            message: 'Task deleted successfully',
        });
    })
);

export default router;
