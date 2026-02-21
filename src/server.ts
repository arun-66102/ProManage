import app from './app';
import prisma from './config/db';
import { env } from './config/env';
import logger from './config/logger';
import { initListeners } from './events/notification.listener';

const start = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        logger.info('✅ Database connected');

        // Initialize event listeners
        initListeners();

        // Start server
        app.listen(env.PORT, () => {
            logger.info(`🚀 ProManage API running on http://localhost:${env.PORT}`);
            logger.info(`📖 Health check: http://localhost:${env.PORT}/api/health`);
            logger.info(`🔧 Environment: ${env.NODE_ENV}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

start();
