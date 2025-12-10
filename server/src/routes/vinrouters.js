import express from 'express';

const router = express.Router();

// GET /api/vin/decode/:vin
router.get('/decode/:vin', async (req, res) => {
  const { vin } = req.params;

  if (!vin || vin.length !== 17) {
    return res.status(400).json({ message: 'Nieprawidłowy VIN (wymagane 17 znaków)' });
  }

  try {
    // Node 18+ ma globalne fetch. Jeśli masz starszego Node'a, dam znać niżej co zrobić.
    const upstreamRes = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
    );

    if (!upstreamRes.ok) {
      throw new Error(`Upstream status ${upstreamRes.status}`);
    }

    const data = await upstreamRes.json();

    const make  = data.Results.find(r => r.Variable === 'Make')?.Value || null;
    const model = data.Results.find(r => r.Variable === 'Model')?.Value || null;
    const year  = data.Results.find(r => r.Variable === 'Model Year')?.Value || null;

    return res.json({ make, model, year });

  } catch (err) {
    console.error('[VIN API error]', err.message);
    return res.status(502).json({ message: 'Nie udało się pobrać danych VIN z API zewnętrznego' });
  }
});

export default router;