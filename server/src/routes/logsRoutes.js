import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listLogs } from '../services/auditService.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json(listLogs(limit));
});

export default router;
