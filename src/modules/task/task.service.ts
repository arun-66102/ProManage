import prisma from '../../config/db';
import appEmitter from '../../events/emitter';
import { ApiError } from '../../utils/apiError';
import { CreateTaskInput, UpdateTaskInput } from './task.schema';

// ─── Create ──────────────────────────────────────────────

export const create = async (data: CreateTaskInput, creatorEmail: string) => {
    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) throw ApiError.notFound('Project not found');

    const task = await prisma.task.create({
        data: {
            title: data.title,
            description: data.description,
            priority: data.priority,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            projectId: data.projectId,
            assigneeId: data.assigneeId,
        },
        include: {
            assignee: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, name: true } },
        },
    });

    // Emit event if task was assigned during creation
    if (task.assignee) {
        appEmitter.emit('task:assigned', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeEmail: task.assignee.email,
            assignedBy: creatorEmail,
        });
    }

    // Log audit
    await prisma.auditLog.create({
        data: {
            userId: task.assigneeId || 0,
            action: 'TASK_CREATED',
            entity: 'task',
            entityId: task.id,
            metadata: JSON.stringify({ title: task.title, projectId: task.projectId }),
        },
    });

    return task;
};

// ─── Get All (by project) ────────────────────────────────

export const getByProject = async (projectId: number) => {
    return prisma.task.findMany({
        where: { projectId },
        include: {
            assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
};

// ─── Get All Tasks for a User (across all workspaces) ────
// Demonstrates: Complex SQL-like query via Prisma (Phase 6)

export const getMyTasks = async (userId: number) => {
    return prisma.task.findMany({
        where: { assigneeId: userId },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    workspace: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
};

// ─── Get By ID ───────────────────────────────────────────

export const getById = async (id: number) => {
    const task = await prisma.task.findUnique({
        where: { id },
        include: {
            assignee: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, name: true } },
        },
    });

    if (!task) throw ApiError.notFound('Task not found');
    return task;
};

// ─── Update ──────────────────────────────────────────────

export const update = async (id: number, data: UpdateTaskInput, updaterEmail: string) => {
    const existingTask = await prisma.task.findUnique({
        where: { id },
        include: { assignee: { select: { email: true } } },
    });

    if (!existingTask) throw ApiError.notFound('Task not found');

    const task = await prisma.task.update({
        where: { id },
        data: {
            ...data,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        },
        include: {
            assignee: { select: { id: true, name: true, email: true } },
        },
    });

    // Emit event if assignee changed
    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId && task.assignee) {
        appEmitter.emit('task:assigned', {
            taskId: task.id,
            taskTitle: task.title,
            assigneeEmail: task.assignee.email,
            assignedBy: updaterEmail,
        });
    }

    // Emit event if status changed
    if (data.status && data.status !== existingTask.status) {
        appEmitter.emit('task:statusChanged', {
            taskId: task.id,
            oldStatus: existingTask.status,
            newStatus: data.status,
            changedBy: updaterEmail,
        });
    }

    return task;
};

// ─── Delete ──────────────────────────────────────────────

export const remove = async (id: number) => {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw ApiError.notFound('Task not found');

    await prisma.task.delete({ where: { id } });
};
