import { Router } from 'express';
import { sendSuccess } from '../utils/response.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    // Verify database connectivity
    await prisma.$queryRaw`SELECT 1`;

    return sendSuccess(res, {
      status: 'ok',
      service: 'dinepilot-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    }, 'DinePilot API and Database are healthy');
  } catch (error) {
    next(error);
  }
});

export default router;
