import { db } from '../db.js';

export function searchPartsInWholesaler(query) {
  // Symulacja danych
  const mockDb = [
    { id: 'HAM-001', name: 'Klocki hamulcowe przód (TRW)', index: 'GDB1307', price: 145.00, stock: 'Dostępne' },
    { id: 'FIL-023', name: 'Filtr oleju (Mann)', index: 'W712/95', price: 35.50, stock: 'Duża ilość' },
    { id: 'AMO-999', name: 'Amortyzator tył (Sachs)', index: '313 000', price: 210.00, stock: '24h' },
    { id: 'WIC-500', name: 'Wycieraczki Bosch Aerotwin', index: '3 397 007', price: 95.00, stock: 'Dostępne' },
    { id: 'ROZ-123', name: 'Zestaw paska rozrządu', index: 'CT1139K2', price: 450.00, stock: 'Na zamówienie' }
  ];

  if (!query) return [];
  
  const lowerQuery = query.toLowerCase();
  return mockDb.filter(part => 
    part.name.toLowerCase().includes(lowerQuery) || 
    part.index.toLowerCase().includes(lowerQuery)
  );
}

export function createOrder(workshopId, partData) {
  const now = new Date().toISOString();
  
  const order = {
    id: `ORD-${Date.now()}`,
    workshopId,
    ...partData,
    status: 'Przyjęto do realizacji',
    createdAt: now
  };

  console.log(`[HURTOWNIA] Nowe zamówienie od warsztatu ${workshopId}:`, partData);
  return order;
}