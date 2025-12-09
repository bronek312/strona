import { Router } from 'express';
// Upewnij się, że importujesz middleware tak jak w innych plikach (np. auth.js)
import { requireWorkshop } from '../middleware/auth.js'; 
import * as partsService from '../services/partsService.js';

const router = Router();

// GET /api/parts/search?q=Audi
router.get('/search', requireWorkshop, (req, res) => {
  try {
    const query = req.query.q || '';
    const results = partsService.searchPartsInWholesaler(query);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Błąd połączenia z katalogiem części.' });
  }
});

// POST /api/parts/order
router.post('/order', requireWorkshop, (req, res) => {
  try {
    const { partId, partName, quantity } = req.body;
    // Sprawdzamy czy user istnieje, jeśli nie - bierzemy ID z tokenu
    const workshopId = req.user?.workshopId || req.user?.id;

    const order = partsService.createOrder(workshopId, { partId, partName, quantity });
    
    res.status(201).json({ 
      message: 'Zamówienie wysłane do hurtowni.', 
      order 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Nie udało się złożyć zamówienia.' });
  }
});

// KLUCZOWA ZMIANA - export default naprawia Twój błąd:
export default router;