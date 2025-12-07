import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireWorkshop } from '../middleware/auth.js';
import {
  listWorkshops,
  listActiveWorkshops,
  createWorkshop,
  updateWorkshop,
  getWorkshopById,
  deleteWorkshop
} from '../services/workshopsService.js';
import {
  listWorkshopBilling,
  createWorkshopBillingEntry,
  updateWorkshopBillingEntry
} from '../services/workshopBillingService.js';
import { createWorkshopAccount, upsertWorkshopAccount } from '../services/workshopUsersService.js';
import { logAction } from '../services/auditService.js';

const router = Router();

const normalizeMoney = (value) => {
  if (value === '' || value === null || typeof value === 'undefined') {
    return undefined;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : value;
};

const requiredMoneyField = z.preprocess(normalizeMoney, z.number().nonnegative());
const optionalMoneyField = z.preprocess(normalizeMoney, z.number().nonnegative()).optional();

const billingMonthField = z
  .string()
  .regex(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/, 'Podaj miesiac w formacie RRRR-MM');

const baseWorkshopSchema = z.object({
  name: z.string().min(3).max(120),
  address: z.string().min(3).max(200).optional().or(z.literal('').transform(() => undefined)),
  city: z.string().min(2).max(120).optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().min(5).max(32).optional().or(z.literal('').transform(() => undefined)),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  billingEmail: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  subscriptionAmount: optionalMoneyField,
  subscriptionStartDate: z
    .string()
    .min(4)
    .max(32)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  subscriptionInitialAmount: optionalMoneyField,
  subscriptionInitialNote: z
    .string()
    .max(120)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  status: z.enum(['active', 'inactive', 'notice', 'deactivated']).default('active'),
  notes: z.string().max(1000).optional().or(z.literal('').transform(() => undefined))
});

const billingBaseSchema = z.object({
  month: billingMonthField.optional(),
  amount: optionalMoneyField,
  invoiceNumber: z.string().max(60).optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['paid', 'unpaid']).optional(),
  note: z.string().max(200).optional().or(z.literal('').transform(() => undefined))
});

const billingCreateSchema = billingBaseSchema.extend({
  month: billingMonthField,
  amount: requiredMoneyField
});

const billingUpdateSchema = billingBaseSchema;

const parseWorkshopId = (value) => {
  const numericId = Number(value);
  return Number.isFinite(numericId) ? numericId : null;
};

const createWorkshopSchema = baseWorkshopSchema.extend({
  loginEmail: z.string().email(),
  loginPassword: z.string().min(8).max(64)
});

const updateWorkshopSchema = baseWorkshopSchema.partial().extend({
  loginEmail: z.string().email().optional(),
  loginPassword: z.string().min(8).max(64).optional()
});

const safeOptional = (value) => (value === '' ? undefined : value);

const normalizePayload = (payload) => ({
  ...payload,
  address: safeOptional(payload.address),
  city: safeOptional(payload.city),
  phone: safeOptional(payload.phone),
  email: safeOptional(payload.email),
  billingEmail: safeOptional(payload.billingEmail),
  subscriptionStartDate: safeOptional(payload.subscriptionStartDate),
  subscriptionInitialNote: safeOptional(payload.subscriptionInitialNote),
  notes: safeOptional(payload.notes),
  loginEmail: safeOptional(payload.loginEmail),
  loginPassword: safeOptional(payload.loginPassword)
});

router.get('/public', (req, res) => {
  res.json(listActiveWorkshops());
});

router.get('/', requireAuth, (req, res) => {
  res.json(listWorkshops());
});

router.get('/me', requireWorkshop, (req, res) => {
  if (!req.user?.workshopId) {
    return res.status(400).json({ message: 'Brakuje przypisanego warsztatu.' });
  }
  const workshop = getWorkshopById(req.user.workshopId);
  if (!workshop) {
    return res.status(404).json({ message: 'Workshop not found' });
  }
  res.json(workshop);
});

router.get('/:id', requireAuth, (req, res) => {
  const workshopId = parseWorkshopId(req.params.id);
  if (!workshopId) {
    return res.status(400).json({ message: 'Invalid workshop id' });
  }
  const workshop = getWorkshopById(workshopId);
  if (!workshop) {
    return res.status(404).json({ message: 'Workshop not found' });
  }
  const billingHistory = listWorkshopBilling(workshopId);
  res.json({ ...workshop, billingHistory });
});

router.post('/', requireAuth, async (req, res) => {
  const parsed = createWorkshopSchema.safeParse(normalizePayload(req.body || {}));
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }

  const { loginEmail, loginPassword, ...workshopData } = parsed.data;

  let workshop;
  try {
    workshop = createWorkshop(workshopData);
    createWorkshopAccount({ workshopId: workshop.id, email: loginEmail, password: loginPassword });
    logAction({
      type: 'workshops:create',
      message: `Dodano warsztat ${workshop.name}`,
      actorEmail: req.user?.email,
      payload: { id: workshop.id, loginEmail }
    });
    res.status(201).json({ ...workshop, loginEmail });
  } catch (error) {
    if (workshop?.id) {
      deleteWorkshop(workshop.id);
    }
    if (error?.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ message: 'Adres e-mail logowania jest juz zajety.' });
    }
    console.error('Failed to create workshop', error);
    res.status(500).json({ message: 'Nie udalo sie utworzyc warsztatu.' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const parsed = updateWorkshopSchema.safeParse(normalizePayload(req.body || {}));
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }

  const workshopId = parseWorkshopId(req.params.id);
  if (!workshopId) {
    return res.status(400).json({ message: 'Invalid workshop id' });
  }
  const existing = getWorkshopById(workshopId);
  if (!existing) {
    return res.status(404).json({ message: 'Workshop not found' });
  }

  const { loginEmail, loginPassword, ...updates } = parsed.data;
  try {
    const workshop = updateWorkshop(workshopId, updates);
    if (loginEmail || loginPassword) {
      upsertWorkshopAccount({ workshopId: workshop.id, email: loginEmail, password: loginPassword });
    }
    logAction({
      type: 'workshops:update',
      message: `Zmieniono dane warsztatu ${workshop.name}`,
      actorEmail: req.user?.email,
      payload: { id: workshop.id, changes: { ...updates, loginEmail: loginEmail || undefined } }
    });
    res.json({ ...workshop, loginEmail: loginEmail ?? workshop.loginEmail });
  } catch (error) {
    if (error?.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ message: 'Adres e-mail logowania jest juz zajety.' });
    }
    console.error('Failed to update workshop account', error);
    res.status(500).json({ message: 'Nie udalo sie zaktualizowac warsztatu.' });
  }
});

router.get('/:id/billing', requireAuth, (req, res) => {
  const workshopId = parseWorkshopId(req.params.id);
  if (!workshopId) {
    return res.status(400).json({ message: 'Invalid workshop id' });
  }
  const workshop = getWorkshopById(workshopId);
  if (!workshop) {
    return res.status(404).json({ message: 'Workshop not found' });
  }
  res.json(listWorkshopBilling(workshopId));
});

router.post('/:id/billing', requireAuth, (req, res) => {
  const workshopId = parseWorkshopId(req.params.id);
  if (!workshopId) {
    return res.status(400).json({ message: 'Invalid workshop id' });
  }
  const workshop = getWorkshopById(workshopId);
  if (!workshop) {
    return res.status(404).json({ message: 'Workshop not found' });
  }
  const parsed = billingCreateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }
  try {
    const entry = createWorkshopBillingEntry(workshopId, parsed.data);
    res.status(201).json(entry);
  } catch (error) {
    console.error('Failed to create billing entry', error);
    res.status(500).json({ message: 'Nie udalo sie zapisac rozliczenia.' });
  }
});

router.patch('/:id/billing/:billingId', requireAuth, (req, res) => {
  const workshopId = parseWorkshopId(req.params.id);
  const billingId = Number(req.params.billingId);
  if (!workshopId || !Number.isFinite(billingId)) {
    return res.status(400).json({ message: 'Invalid identifier' });
  }
  const workshop = getWorkshopById(workshopId);
  if (!workshop) {
    return res.status(404).json({ message: 'Workshop not found' });
  }
  const parsed = billingUpdateSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid payload', issues: parsed.error.issues });
  }
  if (!Object.keys(parsed.data).length) {
    return res.status(400).json({ message: 'Brak danych do aktualizacji.' });
  }
  try {
    const entry = updateWorkshopBillingEntry(workshopId, billingId, parsed.data);
    if (!entry) {
      return res.status(404).json({ message: 'Billing entry not found' });
    }
    res.json(entry);
  } catch (error) {
    console.error('Failed to update billing entry', error);
    res.status(500).json({ message: 'Nie udalo sie zaktualizowac rozliczenia.' });
  }
});

export default router;
