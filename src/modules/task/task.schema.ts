import { z } from 'zod';

export const createTaskSchema = z.object({
    title: z.string().min(2, 'Title must be at least 2 characters'),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    dueDate: z
        .string()
        .datetime({ message: 'Due date must be a valid ISO date' })
        .refine((date) => new Date(date) > new Date(), {
            message: 'Due date must be in the future',
        })
        .optional(),
    projectId: z.number().int().positive('Project ID is required'),
    assigneeId: z.number().int().positive().optional(),
});

export const updateTaskSchema = z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
    dueDate: z.string().datetime().optional(),
    assigneeId: z.number().int().positive().nullable().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
