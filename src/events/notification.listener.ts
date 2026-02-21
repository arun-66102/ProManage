import logger from '../config/logger';
import appEmitter from './emitter';

// ─── Task Assigned Notification ──────────────────────────
appEmitter.on('task:assigned', (payload: { taskId: number; taskTitle: string; assigneeEmail: string; assignedBy: string }) => {
    logger.info(
        `📧 [Notification] Task "${payload.taskTitle}" (ID: ${payload.taskId}) assigned to ${payload.assigneeEmail} by ${payload.assignedBy}`
    );
    // In production: integrate with an email service (SendGrid, SES, etc.)
});

// ─── Task Status Changed ─────────────────────────────────
appEmitter.on('task:statusChanged', (payload: { taskId: number; oldStatus: string; newStatus: string; changedBy: string }) => {
    logger.info(
        `🔄 [Notification] Task #${payload.taskId} moved from "${payload.oldStatus}" to "${payload.newStatus}" by ${payload.changedBy}`
    );
});

// ─── Project Deleted ─────────────────────────────────────
appEmitter.on('project:deleted', (payload: { projectId: number; projectName: string; deletedBy: string }) => {
    logger.info(
        `🗑️ [Notification] Project "${payload.projectName}" (ID: ${payload.projectId}) deleted by ${payload.deletedBy}`
    );
});

export function initListeners() {
    logger.info('✅ Event listeners initialized');
}
