import { z } from 'zod';

export const createProjectSchema = z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters'),
    description: z.string().optional(),
    workspaceId: z.number().int().positive('Workspace ID is required'),
});

export const updateProjectSchema = z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
