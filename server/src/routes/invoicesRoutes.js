import { Router } from 'express';
import { requireWorkshop } from '../middleware/auth.js';
import * as invoicesService from '../services/invoicesService.js';

const router = Router();

// Pobierz wszystkie faktury warsztatu
router.get('/', requireWorkshop, (req, res) => {
  try {
    const invoices = invoicesService.getInvoicesByWorkshop(req.user.workshopId || req.user.id);
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania faktur' });
  }
});

// Pobierz sugerowany numer kolejnej faktury
router.get('/next-number', requireWorkshop, (req, res) => {
  try {
    const number = invoicesService.getNextInvoiceNumber(req.user.workshopId || req.user.id);
    res.json({ number });
  } catch (err) {
    res.status(500).json({ error: 'Błąd generowania numeru' });
  }
});

// Utwórz nową fakturę
router.post('/', requireWorkshop, (req, res) => {
  try {
    const workshopId = req.user.workshopId || req.user.id;
    const invoice = invoicesService.createInvoice(req.body, workshopId);
    res.status(201).json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd tworzenia faktury' });
  }
});

// Symulacja wysyłki e-mail
router.post('/:id/send', requireWorkshop, (req, res) => {
    // Tutaj podpiąłbyś bibliotekę 'nodemailer'
    console.log(`[EMAIL] Wysłano fakturę ${req.params.id} do klienta.`);
    res.json({ success: true, message: "Faktura wysłana na e-mail klienta." });
});

export default router;