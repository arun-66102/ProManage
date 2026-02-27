import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { errorHandler } from './middlewares/error.middleware';

// ─── Route Imports ───────────────────────────────────────
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/project/project.routes';
import taskRoutes from './modules/task/task.routes';
import uploadRoutes from './modules/upload/upload.routes';
import workspaceRoutes from './modules/workspace/workspace.routes';

const app = express();

// ─── Global Middleware ───────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: ['https://pro-manage-frontend-inky.vercel.app', 'http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5500']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
import path from 'path';
app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Rate Limiting (on auth routes) ─────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,                   // 20 requests per window
    message: { status: 'error', message: 'Too many requests. Try again in 15 minutes.' },
});

// ─── Health Check ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ─── Routes ──────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/upload', uploadRoutes);

// ─── 404 Handler ─────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
    });
});

// ─── Zod Validation Error Handler ────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ZodError) {
        res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: err.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }
    next(err);
});

// ─── Centralized Error Handler ───────────────────────────
app.use(errorHandler);

export default app;
