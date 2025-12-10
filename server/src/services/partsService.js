import { db } from '../db.js';

// Wyszukiwanie części w lokalnej bazie
export function searchPartsInWholesaler(query) {
  if (!query) return [];
  
  try {
    const lowerQuery = `%${query.toLowerCase()}%`;
    
    // better-sqlite3 używa .prepare() i .all()
    const parts = db.prepare(`
      SELECT * FROM parts 
      WHERE lower(name) LIKE ? OR lower(code) LIKE ? 
      LIMIT 20
    `).all(lowerQuery, lowerQuery);

    return parts;
  } catch (err) {
    console.error('[DB ERROR] Search parts:', err.message);
    throw new Error('Błąd podczas szukania części');
  }
}

// Tworzenie zamówienia
export function createOrder(workshopId, partData) {
  if (!workshopId || !partData) {
    throw new Error('Brak wymaganych danych do zamówienia');
  }

  try {
    // Transaction - operacja atomowa (bezpieczna)
    const insertOrder = db.transaction(() => {
        const stmt = db.prepare(`
            INSERT INTO orders (workshop_id, part_name, part_index, price, status)
            VALUES (?, ?, ?, ?, 'pending')
        `);
        
        const info = stmt.run(
            workshopId,
            partData.name,
            partData.index || '',
            partData.price
        );
        
        // Zwracamy nowo utworzone zamówienie
        return {
            id: info.lastInsertRowid,
            workshopId,
            ...partData,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
    });

    const newOrder = insertOrder();
    console.log(`[ZAMÓWIENIE] Utworzono zamówienie ID: ${newOrder.id} dla warsztatu ${workshopId}`);
    return newOrder;

  } catch (err) {
    console.error('[DB ERROR] Create order:', err.message);
    throw new Error('Nie udało się utworzyć zamówienia');
  }
}