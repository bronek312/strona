import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkshop } from '../middleware/auth.js';
import {
  createReport,
  listReports,
  updateReportStatus,
  findReportsByVin,
  updateReport,
  getReportById,
  listReportsByWorkshop
} from '../services/reportsService.js';
import { logAction } from '../services/auditService.js';
import { getWorkshopById } from '../services/workshopsService.js';

const router = Router();
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{11,17}$/i;

const baseReportSchema = {
  vin: z.string().regex(VIN_PATTERN, 'Niepoprawny VIN'),
  registrationNumber: z.string().min(2).max(32).optional().nullable(),
  workshopName: z.string().min(2).max(120).optional(),
  mileageKm: z
    .preprocess((value) => {
      if (value === '' || value === null || typeof value === 'undefined') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }, z.number().int().nonnegative().optional())
    .nullable(),
  firstRegistrationDate: z
    .preprocess((value) => (value === '' || value === null ? undefined : value), z.string().optional())
    .nullable(),
  status: z.string().min(3).max(64).optional(),
  summary: z.string().min(10).max(2000).optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional()
};

const createReportSchema = z.object(baseReportSchema);
const updateReportSchema = z.object({
  ...baseReportSchema,
  moderationNote: z.string().max(500).optional().nullable(),
  moderatedBy: z.string().optional().nullable(),
  moderatedAt: z.string().optional().nullable()
});

const statusOnlySchema = z.object({ status: z.string().min(3).max(64) });
const workshopReportSchema = z.object({
  vin: baseReportSchema.vin,
  registrationNumber: baseReportSchema.registrationNumber,
  mileageKm: baseReportSchema.mileageKm,
  firstRegistrationDate: baseReportSchema.firstRegistrationDate,
  summary: z.string().min(10).max(2000),
  status: baseReportSchema.status.optional()
});

router.get('/', requireAuth, (req, res) => {
  const { workshopId } = req.query;
  if (workshopId) {
    return res.json(listReportsByWorkshop(Number(workshopId)));
  }
  res.json(listReports());
});

router.get('/mine', requireWorkshop, (req, res) => {
  if (!req.user?.workshopId) {
    return res.status(400).json({ message: 'Brakuje przypisanego warsztatu dla tego konta.' });
  }
  res.json(listReportsByWorkshop(req.user.workshopId));
});

router.get('/public/:vin', (req, res) => {
  const vin = req.params.vin?.toUpperCase();
  if (!VIN_PATTERN.test(vin)) {
    return res.status(400).json({ message: 'Niepoprawny VIN' });
  }
  res.json(findReportsByVin(vin));
});

router.post('/', (req, res) => {
  const parsed = createReportSchema.safeParse({ ...req.body, vin: req.body?.vin?.toUpperCase() });
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }
  const report = createReport(parsed.data);
  logAction({
    type: 'reports:create',
    message: `Dodano raport dla VIN ${report.vin}`,
    payload: { id: report.id, vin: report.vin }
  });
  res.status(201).json(report);
});

router.post('/mine', requireWorkshop, (req, res) => {
  if (!req.user?.workshopId) {
    return res.status(400).json({ message: 'Brakuje przypisanego warsztatu dla tego konta.' });
  }

  const parsed = workshopReportSchema.safeParse({
    ...req.body,
    vin: req.body?.vin?.toUpperCase(),
    registrationNumber: req.body?.registrationNumber?.toUpperCase()
  });

  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }

  const workshop = getWorkshopById(req.user.workshopId);
  if (!workshop) {
    return res.status(404).json({ message: 'Workshop not found' });
  }

  const report = createReport(parsed.data, { workshopId: workshop.id, workshopName: workshop.name });
  logAction({
    type: 'reports:create:workshop',
    message: `Warsztat ${workshop.name} dodal raport ${report.vin}`,
    actorEmail: req.user?.email,
    payload: { id: report.id, workshopId: workshop.id }
  });
  res.status(201).json(report);
});

router.patch('/:id', requireAuth, (req, res) => {
  const parsed = updateReportSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }
  const existing = getReportById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Report not found' });
  }
  const report = updateReport(req.params.id, parsed.data);
  logAction({
    type: 'reports:update',
    message: `Zaktualizowano raport ${report.vin}`,
    actorEmail: req.user?.email,
    payload: { id: report.id, changes: parsed.data }
  });
  res.json(report);
});

router.patch('/:id/status', requireAuth, (req, res) => {
  const parsed = statusOnlySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid payload' });
  const updated = updateReportStatus(req.params.id, parsed.data.status);
  if (!updated) {
    return res.status(404).json({ message: 'Report not found' });
  }
  logAction({
    type: 'reports:status',
    message: `Zmieniono status raportu ${updated.vin}`,
    actorEmail: req.user?.email,
    payload: { id: updated.id, status: parsed.data.status }
  });
  res.json(updated);
});

export default router;

// 1. Moje raporty (dla warsztatu)
router.get('/mine', authMiddleware, (req, res) => {
  const workshopId = req.user.workshopId || req.user.id;
  const stmt = db.prepare('SELECT * FROM reports WHERE workshop_id = ? ORDER BY createdAt DESC');
  const reports = stmt.all(workshopId);
  res.json(reports);
});

// 2. Dodaj raport (dla warsztatu)
router.post('/mine', authMiddleware, (req, res) => {
  const { vin, plate, model, mileage, description } = req.body;
  const workshopId = req.user.workshopId || req.user.id;

  if (!vin || vin.length !== 17 || !plate || !description) {
    return res.status(400).json({ error: "Nieprawidłowe dane" });
  }

  const stmt = db.prepare(`
    INSERT INTO reports (vin, plate, model, mileage, description, workshop_id, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
  `);
  
  try {
    const result = stmt.run(vin.toUpperCase(), plate.toUpperCase(), model || null, mileage, description, workshopId);
    const newReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newReport);
  } catch (err) {
    res.status(500).json({ error: "Błąd zapisu" });
  }
});