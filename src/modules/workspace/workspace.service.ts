import prisma from '../../config/db';
import { ApiError } from '../../utils/apiError';
import { CreateWorkspaceInput, UpdateWorkspaceInput } from './workspace.schema';

// ─── Create ──────────────────────────────────────────────

export const create = async (data: CreateWorkspaceInput, userId: number) => {
    return prisma.workspace.create({
        data: {
            name: data.name,
            ownerId: userId,
        },
        include: { owner: { select: { id: true, name: true, email: true } } },
    });
};

// ─── Get All (for a user) ────────────────────────────────

export const getAll = async (userId: number) => {
    return prisma.workspace.findMany({
        where: { ownerId: userId },
        include: {
            _count: { select: { projects: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
};

// ─── Get By ID ───────────────────────────────────────────

export const getById = async (id: number, userId: number) => {
    const workspace = await prisma.workspace.findFirst({
        where: { id, ownerId: userId },
        include: {
            projects: true,
            owner: { select: { id: true, name: true, email: true } },
        },
    });

    if (!workspace) {
        throw ApiError.notFound('Workspace not found');
    }

    return workspace;
};

// ─── Update ──────────────────────────────────────────────

export const update = async (id: number, data: UpdateWorkspaceInput, userId: number) => {
    const workspace = await prisma.workspace.findFirst({
        where: { id, ownerId: userId },
    });

    if (!workspace) {
        throw ApiError.notFound('Workspace not found');
    }

    return prisma.workspace.update({
        where: { id },
        data: { name: data.name },
    });
};

// ─── Delete (Admin Only) ─────────────────────────────────

export const remove = async (id: number) => {
    const workspace = await prisma.workspace.findUnique({ where: { id } });

    if (!workspace) {
        throw ApiError.notFound('Workspace not found');
    }

    await prisma.workspace.delete({ where: { id } });
};
