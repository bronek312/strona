import { db } from '../db.js';

const FIELD_COLUMN_MAP = {
  vin: 'vin',
  registrationNumber: 'registration_number',
  workshopName: 'workshop_name',
  workshopId: 'workshop_id',
  mileageKm: 'mileage_km',
  firstRegistrationDate: 'first_registration_date',
  status: 'status',
  approvalStatus: 'approval_status',
  summary: 'summary',
  moderationNote: 'moderation_note',
  moderatedBy: 'moderated_by',
  moderatedAt: 'moderated_at'
};

const insertStmt = db.prepare(`
  INSERT INTO reports (
    vin,
    registration_number,
    workshop_name,
    workshop_id,
    mileage_km,
    first_registration_date,
    status,
    approval_status,
    summary,
    created_at,
    updated_at
  ) VALUES (@vin, @registrationNumber, @workshopName, @workshopId, @mileageKm, @firstRegistrationDate, @status, @approvalStatus, @summary, @createdAt, @updatedAt)
`);

const selectAllStmt = db.prepare('SELECT * FROM reports ORDER BY updated_at DESC');
const selectByIdStmt = db.prepare('SELECT * FROM reports WHERE id = ?');
const selectByVinStmt = db.prepare(
  "SELECT * FROM reports WHERE vin = ? AND approval_status = 'approved' ORDER BY updated_at DESC"
);
const selectByWorkshopStmt = db.prepare('SELECT * FROM reports WHERE workshop_id = ? ORDER BY updated_at DESC');

const buildUpdateStatement = (payloadKeys) => {
  const assignments = payloadKeys.map((key) => `${FIELD_COLUMN_MAP[key]} = @${key}`);
  return db.prepare(`UPDATE reports SET ${assignments.join(', ')}, updated_at = @updatedAt WHERE id = @id`);
};

const mapReport = (row) =>
  row
    ? {
        id: row.id,
        vin: row.vin,
        registrationNumber: row.registration_number,
        workshopName: row.workshop_name,
        workshopId: row.workshop_id,
        mileageKm: row.mileage_km,
        firstRegistrationDate: row.first_registration_date,
        status: row.status,
        approvalStatus: row.approval_status,
        summary: row.summary,
        moderationNote: row.moderation_note,
        moderatedBy: row.moderated_by,
        moderatedAt: row.moderated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        media: []
      }
    : null;

export function createReport(payload, options = {}) {
  const now = new Date().toISOString();
  const defaults = {
    status: 'W trakcie',
    approvalStatus: 'pending',
    workshopName: options.workshopName || payload.workshopName || 'Nieznany warsztat'
  };

  const params = {
    vin: payload.vin?.toUpperCase(),
    registrationNumber: payload.registrationNumber?.toUpperCase() || null,
    workshopName: defaults.workshopName,
    workshopId: options.workshopId ?? payload.workshopId ?? null,
    mileageKm: Number.isFinite(payload.mileageKm) ? Number(payload.mileageKm) : null,
    firstRegistrationDate: payload.firstRegistrationDate || null,
    status: payload.status || defaults.status,
    approvalStatus: payload.approvalStatus || defaults.approvalStatus,
    summary: payload.summary || null,
    createdAt: now,
    updatedAt: now
  };

  const result = insertStmt.run(params);
  return mapReport(selectByIdStmt.get(result.lastInsertRowid));
}

export function listReports() {
  return selectAllStmt.all().map(mapReport);
}

export function listReportsByWorkshop(workshopId) {
  if (!workshopId) {
    return [];
  }
  return selectByWorkshopStmt.all(workshopId).map(mapReport);
}

export function getReportById(id) {
  return mapReport(selectByIdStmt.get(id));
}


export function updateReport(id, updates) {
  const entries = Object.entries(updates).filter(([key]) => FIELD_COLUMN_MAP[key]);
  if (!entries.length) {
    return getReportById(id);
  }

  const params = entries.reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: key === 'mileageKm' && value !== null ? Number(value) : value
    }),
    { id, updatedAt: new Date().toISOString() }
  );

  if (typeof params.vin === 'string') {
    params.vin = params.vin.toUpperCase();
  }
  if (typeof params.registrationNumber === 'string') {
    params.registrationNumber = params.registrationNumber.toUpperCase();
  }

  const stmt = buildUpdateStatement(entries.map(([key]) => key));
  stmt.run(params);
  return getReportById(id);
}

export function updateReportStatus(id, status) {
  return updateReport(id, { status });
}

export function findReportsByVin(vin) {
  return selectByVinStmt.all(vin).map(mapReport);
}
