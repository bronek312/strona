import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkshop } from '../middleware/auth.js';
import {
  createReport,
  listReports, // <--- To jest kluczowe dla Admina
  updateReportStatus,
  findReportsByVin,
  updateReport,
  getReportById,
  listReportsByWorkshop
} from '../services/reportsService.js';
import { logAction } from '../services/auditService.js';
import { getWorkshopById } from '../services/workshopsService.js';

const router = Router();
const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/i;

// Schemat walidacji
const workshopReportSchema = z.object({
  vin: z.string().regex(VIN_PATTERN, 'VIN musi mieć 17 znaków (bez I, O, Q)'),
  registrationNumber: z.string().min(2).max(15, 'Nr rejestracyjny jest za krótki lub za długi'),
  mileageKm: z.coerce.number().int().nonnegative('Przebieg musi być liczbą dodatnią'),
  firstRegistrationDate: z.string().optional().nullable(),
  summary: z.string().min(5, 'Opis jest za krótki').max(2000),
  status: z.string().optional()
});

// ==========================================
// 1. ENDPOINTY DLA ADMINISTRATORA (I OGÓLNE)
// ==========================================

// GET /api/reports - Lista wszystkich raportów (Naprawia błąd w panelu Admina)
router.get('/', requireAuth, (req, res) => {
  // Jeśli to administrator, zwróć wszystko
  if (req.user.role === 'admin' || req.user.isAdmin === true || (req.user.email && req.user.email.includes('admin'))) {
      return res.json(listReports());
  }
  
  // Jeśli to warsztat, zwróć tylko jego (zabezpieczenie)
  if (req.user.workshopId) {
      return res.json(listReportsByWorkshop(req.user.workshopId));
  }

  // Inni użytkownicy
  return res.status(403).json({ message: "Brak uprawnień do przeglądania raportów." });
});

// GET /api/reports/public/:vin - Publiczne sprawdzanie
router.get('/public/:vin', (req, res) => {
  const vin = req.params.vin?.toUpperCase();
  if (!VIN_PATTERN.test(vin)) return res.status(400).json({ message: 'Niepoprawny VIN' });
  res.json(findReportsByVin(vin));
});

// ==========================================
// 2. ENDPOINTY DLA WARSZTATU (/mine)
// ==========================================

// GET /api/reports/mine - Pobierz moje raporty
router.get('/mine', requireWorkshop, (req, res) => {
  if (!req.user?.workshopId) {
    return res.status(400).json({ message: 'Błąd konta warsztatu.' });
  }
  const reports = listReportsByWorkshop(req.user.workshopId);
  res.json(reports);
});

// POST /api/reports/mine - Dodaj raport
router.post('/mine', requireWorkshop, (req, res) => {
  if (!req.user?.workshopId) return res.status(400).json({ message: 'Błąd konta.' });

  const rawData = {
    vin: req.body.vin?.toUpperCase(),
    registrationNumber: req.body.plate?.toUpperCase(),
    mileageKm: req.body.mileage,
    firstRegistrationDate: req.body.firstRegistrationDate || null,
    summary: `[Pojazd: ${req.body.make} ${req.body.model}] ${req.body.description}`,
    status: 'pending'
  };

  const parsed = workshopReportSchema.safeParse(rawData);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Błąd walidacji', issues: parsed.error.issues });
  }

  const workshop = getWorkshopById(req.user.workshopId);
  if (!workshop) return res.status(404).json({ message: 'Nie znaleziono warsztatu' });

  try {
    const report = createReport(parsed.data, { workshopId: workshop.id, workshopName: workshop.name });
    logAction({
      type: 'reports:create:workshop',
      message: `Warsztat ${workshop.name} dodał raport ${report.vin}`,
      payload: { id: report.id }
    });
    res.status(201).json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Błąd zapisu bazy danych' });
  }
});

// PATCH /api/reports/mine/:id - Edytuj raport
router.patch('/mine/:id', requireWorkshop, (req, res) => {
    const { id } = req.params;
    const existing = getReportById(id);
    
    if (!existing || existing.workshopId !== req.user.workshopId) {
        return res.status(404).json({ message: "Raport nie istnieje." });
    }
    
    if (existing.status === 'approved' || existing.approvalStatus === 'approved') {
        return res.status(403).json({ message: "Nie można edytować zatwierdzonego raportu." });
    }

    const updateData = {};
    if (req.body.vin) updateData.vin = req.body.vin.toUpperCase();
    if (req.body.plate) updateData.registrationNumber = req.body.plate.toUpperCase();
    if (req.body.mileage) updateData.mileageKm = Number(req.body.mileage);
    if (req.body.firstRegistrationDate !== undefined) updateData.firstRegistrationDate = req.body.firstRegistrationDate;
    if (req.body.description && req.body.make && req.body.model) {
        updateData.summary = `[Pojazd: ${req.body.make} ${req.body.model}] ${req.body.description}`;
    }
    
    updateData.approvalStatus = 'pending';
    updateData.status = 'W trakcie weryfikacji (edytowano)';

    try {
        const updated = updateReport(id, updateData);
        res.json(updated);
    } catch (e) {
        res.status(500).json({message: "Błąd aktualizacji"});
    }
});

// ==========================================
// 3. ENDPOINTY ADMINA (ZARZĄDZANIE)
// ==========================================

// PATCH /api/reports/:id - Admin edytuje raport
router.patch('/:id', requireAuth, (req, res) => {
  // Sprawdź czy to admin
  if (req.user.role !== 'admin' && !req.user.isAdmin) {
      return res.status(403).json({ message: "Brak uprawnień" });
  }

  // Uproszczona walidacja dla admina
  const report = updateReport(req.params.id, req.body);
  
  logAction({
    type: 'reports:update',
    message: `Administrator zaktualizował raport ${report.vin}`,
    payload: { id: report.id, changes: req.body }
  });
  res.json(report);
});

// PATCH /api/reports/:id/status - Zmiana statusu (Zatwierdź/Odrzuć)
router.patch('/:id/status', requireAuth, (req, res) => {
  if (req.user.role !== 'admin' && !req.user.isAdmin) {
      return res.status(403).json({ message: "Brak uprawnień" });
  }

  const { status } = req.body;
  const updated = updateReportStatus(req.params.id, status);
  
  if (!updated) return res.status(404).json({ message: 'Raport nie istnieje' });

  logAction({
    type: 'reports:status',
    message: `Zmieniono status raportu ${updated.vin} na ${status}`,
    payload: { id: updated.id, status }
  });
  res.json(updated);
});

export default router;