// server/src/routes/gusRoutes.js
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js'; 
import { fetchCompanyData } from '../services/gusService.js';

const router = Router();

// GET /api/gus/5213214567
router.get('/:nip', requireAuth, async (req, res) => {
    const { nip } = req.params;

    // Prosta walidacja
    if (!/^\d{10}$/.test(nip)) {
        return res.status(400).json({ error: 'NIP musi mieć 10 cyfr.' });
    }

    try {
        const data = await fetchCompanyData(nip);
        
        if (!data) {
            return res.status(404).json({ error: 'Nie znaleziono firmy.' });
        }

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Błąd serwera GUS.' });
    }
});

export default router;