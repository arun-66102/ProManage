import prisma from '../../config/db';
import appEmitter from '../../events/emitter';
import { ApiError } from '../../utils/apiError';
import { CreateProjectInput, UpdateProjectInput } from './project.schema';

// ─── Create ──────────────────────────────────────────────

export const create = async (data: CreateProjectInput) => {
    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
        where: { id: data.workspaceId },
    });

    if (!workspace) {
        throw ApiError.notFound('Workspace not found');
    }

    return prisma.project.create({
        data: {
            name: data.name,
            description: data.description,
            workspaceId: data.workspaceId,
        },
        include: { workspace: { select: { id: true, name: true } } },
    });
};

// ─── Get All (by workspace) ──────────────────────────────

export const getByWorkspace = async (workspaceId: number) => {
    return prisma.project.findMany({
        where: { workspaceId },
        include: {
            _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
};

// ─── Get By ID ───────────────────────────────────────────

export const getById = async (id: number) => {
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            tasks: {
                include: { assignee: { select: { id: true, name: true, email: true } } },
                orderBy: { createdAt: 'desc' },
            },
            workspace: { select: { id: true, name: true } },
        },
    });

    if (!project) {
        throw ApiError.notFound('Project not found');
    }

    return project;
};

// ─── Update ──────────────────────────────────────────────

export const update = async (id: number, data: UpdateProjectInput) => {
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
        throw ApiError.notFound('Project not found');
    }

    return prisma.project.update({
        where: { id },
        data,
    });
};

// ─── Delete (Transactional) ──────────────────────────────
// Demonstrates: Database Transactions (Phase 6)
// When a project is deleted, all its tasks are deleted atomically.

export const remove = async (id: number, deletedByEmail: string) => {
    const project = await prisma.project.findUnique({
        where: { id },
        include: { tasks: true },
    });

    if (!project) {
        throw ApiError.notFound('Project not found');
    }

    // Transactional delete: tasks first, then project
    await prisma.$transaction(async (tx) => {
        // Delete all tasks belonging to this project
        await tx.task.deleteMany({ where: { projectId: id } });

        // Delete the project itself
        await tx.project.delete({ where: { id } });
    });

    // Emit event after successful deletion
    appEmitter.emit('project:deleted', {
        projectId: id,
        projectName: project.name,
        deletedBy: deletedByEmail,
    });
};
