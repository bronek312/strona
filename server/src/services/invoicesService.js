import { db } from '../db.js';

// 1. Automatyczna migracja (Tworzenie tabeli jeśli nie istnieje)
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workshop_id INTEGER NOT NULL,
      number TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_nip TEXT,
      client_address TEXT,
      date_issued TEXT NOT NULL,
      date_due TEXT NOT NULL,
      items JSON NOT NULL,
      total_net REAL NOT NULL,
      total_vat REAL NOT NULL,
      total_gross REAL NOT NULL,
      status TEXT DEFAULT 'wystawiona',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
} catch (err) {
  console.error("Błąd inicjalizacji tabeli invoices:", err);
}

// 2. Logika biznesowa
export function createInvoice(data, workshopId) {
  const stmt = db.prepare(`
    INSERT INTO invoices (
      workshop_id, number, client_name, client_nip, client_address,
      date_issued, date_due, items, total_net, total_vat, total_gross, status
    ) VALUES (
      @workshopId, @number, @clientName, @clientNip, @clientAddress,
      @dateIssued, @dateDue, @items, @totalNet, @totalVat, @totalGross, 'wystawiona'
    )
  `);

  const info = stmt.run({
    workshopId,
    number: data.number,
    clientName: data.clientName,
    clientNip: data.clientNip || null,
    clientAddress: data.clientAddress,
    dateIssued: data.dateIssued,
    dateDue: data.dateDue,
    items: JSON.stringify(data.items), // Tablica przedmiotów jako JSON
    totalNet: data.totalNet,
    totalVat: data.totalVat,
    totalGross: data.totalGross
  });

  return { id: info.lastInsertRowid, ...data, status: 'wystawiona' };
}

export function getInvoicesByWorkshop(workshopId) {
  const stmt = db.prepare(`SELECT * FROM invoices WHERE workshop_id = ? ORDER BY created_at DESC`);
  const rows = stmt.all(workshopId);
  
  // Parsujemy items z JSON z powrotem na obiekt
  return rows.map(row => ({
    ...row,
    items: JSON.parse(row.items)
  }));
}

export function getNextInvoiceNumber(workshopId) {
  // Prosta logika numeracji: FV/ROK/MIESIĄC/NR
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM invoices WHERE workshop_id = ?`);
  const count = countStmt.get(workshopId).count;
  const date = new Date();
  return `FV/${date.getFullYear()}/${date.getMonth() + 1}/${count + 1}`;
}