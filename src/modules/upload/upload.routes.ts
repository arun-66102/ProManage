import { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import logger from '../../config/logger';
import { authenticate } from '../../middlewares/auth.middleware';

const router = Router();

router.use(authenticate);

const UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * POST /api/upload
 *
 * Stream-based file upload with gzip compression (Phase 4: Streams).
 *
 * How it works:
 * 1. The incoming request itself IS a Readable Stream (req).
 * 2. We pipe it through a Gzip Transform stream.
 * 3. We pipe the compressed output to a Writable File Stream.
 *
 * This means a 1GB file never sits in memory.
 * The file is compressed chunk-by-chunk as it arrives.
 *
 * Usage:
 *   curl -X POST http://localhost:3000/api/upload \
 *     -H "Authorization: Bearer <token>" \
 *     -H "X-Filename: report.pdf" \
 *     --data-binary @./large-file.pdf
 */
router.post('/', (req: Request, res: Response) => {
    const filename = (req.headers['x-filename'] as string) || `upload-${Date.now()}`;
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const outputPath = path.join(UPLOAD_DIR, `${safeFilename}.gz`);

    const gzip = zlib.createGzip();
    const writeStream = fs.createWriteStream(outputPath);

    let bytesReceived = 0;

    req.on('data', (chunk: Buffer) => {
        bytesReceived += chunk.length;
    });

    req.pipe(gzip).pipe(writeStream);

    writeStream.on('finish', () => {
        const stats = fs.statSync(outputPath);
        logger.info(
            `✅ Upload complete: ${safeFilename}.gz | Original: ${(bytesReceived / 1024 / 1024).toFixed(2)}MB | Compressed: ${(stats.size / 1024 / 1024).toFixed(2)}MB`
        );

        res.json({
            status: 'success',
            data: {
                filename: `${safeFilename}.gz`,
                originalSize: bytesReceived,
                compressedSize: stats.size,
                compressionRatio: `${((1 - stats.size / bytesReceived) * 100).toFixed(1)}%`,
            },
        });
    });

    writeStream.on('error', (err) => {
        logger.error('Upload failed:', err);
        res.status(500).json({ status: 'error', message: 'Upload failed' });
    });

    req.on('error', (err) => {
        logger.error('Request stream error:', err);
        writeStream.destroy();
        res.status(500).json({ status: 'error', message: 'Upload stream error' });
    });
});

export default router;
