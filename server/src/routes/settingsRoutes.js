import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAnyUser } from '../middleware/auth.js';
import { getSettings, updateSettings } from '../services/settingsService.js';
import { logAction } from '../services/auditService.js';

const router = Router();

const settingsSchema = z.object({
  licenseMonths: z.number().int().min(1).max(60).optional(),
  statusOptions: z
    .array(z.string().min(2).max(50))
    .min(1)
    .max(10)
    .optional()
});

router.get('/', requireAnyUser, (req, res) => {
  res.json(getSettings());
});

router.patch('/', requireAuth, (req, res) => {
  const parsed = settingsSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }

  const settings = updateSettings(parsed.data);
  logAction({
    type: 'settings:update',
    message: 'Zaktualizowano ustawienia systemowe',
    actorEmail: req.user?.email,
    payload: parsed.data
  });
  res.json(settings);
});

export default router;
