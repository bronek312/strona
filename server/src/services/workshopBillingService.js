import { db } from '../db.js';

const selectByWorkshopStmt = db.prepare(`
  SELECT *
  FROM workshop_billing
  WHERE workshop_id = ?
  ORDER BY month DESC, updated_at DESC
`);

const selectByIdStmt = db.prepare(`
  SELECT *
  FROM workshop_billing
  WHERE id = ? AND workshop_id = ?
`);

const insertStmt = db.prepare(`
  INSERT INTO workshop_billing (workshop_id, month, amount, invoice_number, status, note, created_at, updated_at)
  VALUES (@workshopId, @month, @amount, @invoiceNumber, @status, @note, @createdAt, @updatedAt)
`);

const updateStmt = db.prepare(`
  UPDATE workshop_billing
  SET month = @month,
      amount = @amount,
      invoice_number = @invoiceNumber,
      status = @status,
      note = @note,
      updated_at = @updatedAt
  WHERE id = @id AND workshop_id = @workshopId
`);

const mapBillingEntry = (row) =>
  row
    ? {
        id: row.id,
        workshopId: row.workshop_id,
        month: row.month,
        amount: typeof row.amount === 'number' ? Number(row.amount) : null,
        invoiceNumber: row.invoice_number || null,
        status: row.status || 'unpaid',
        note: row.note || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;

export function listWorkshopBilling(workshopId) {
  return selectByWorkshopStmt.all(workshopId).map(mapBillingEntry);
}

export function getWorkshopBillingEntry(workshopId, billingId) {
  return mapBillingEntry(selectByIdStmt.get(billingId, workshopId));
}

export function createWorkshopBillingEntry(workshopId, payload) {
  const now = new Date().toISOString();
  const params = {
    workshopId,
    month: payload.month,
    amount: typeof payload.amount === 'number' ? payload.amount : null,
    invoiceNumber: payload.invoiceNumber || null,
    status: payload.status || 'unpaid',
    note: payload.note || null,
    createdAt: now,
    updatedAt: now
  };
  const result = insertStmt.run(params);
  return getWorkshopBillingEntry(workshopId, result.lastInsertRowid);
}

export function updateWorkshopBillingEntry(workshopId, billingId, payload) {
  const existing = getWorkshopBillingEntry(workshopId, billingId);
  if (!existing) {
    return null;
  }
  const params = {
    id: billingId,
    workshopId,
    month: payload.month ?? existing.month,
    amount: typeof payload.amount === 'number' ? payload.amount : existing.amount,
    invoiceNumber: typeof payload.invoiceNumber === 'undefined' ? existing.invoiceNumber : payload.invoiceNumber,
    status: payload.status || existing.status,
    note: typeof payload.note === 'undefined' ? existing.note : payload.note,
    updatedAt: new Date().toISOString()
  };
  updateStmt.run(params);
  return getWorkshopBillingEntry(workshopId, billingId);
}
