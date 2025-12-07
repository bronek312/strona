import bcrypt from 'bcrypt';
import { db } from '../db.js';

const insertStmt = db.prepare(`
  INSERT INTO workshop_users (workshop_id, email, password_hash, role, created_at, updated_at)
  VALUES (@workshopId, @email, @passwordHash, 'workshop', @timestamp, @timestamp)
`);

const selectByEmailStmt = db.prepare(`
  SELECT id, workshop_id, email, password_hash, role, created_at, updated_at
  FROM workshop_users
  WHERE lower(email) = lower(?)
`);

const selectByWorkshopStmt = db.prepare(`
  SELECT id, workshop_id, email, password_hash, role, created_at, updated_at
  FROM workshop_users
  WHERE workshop_id = ?
`);

const updateEmailStmt = (fields) =>
  db.prepare(
    `UPDATE workshop_users SET ${fields.join(', ')}, updated_at = @timestamp WHERE workshop_id = @workshopId`
  );

const deleteByWorkshopStmt = db.prepare('DELETE FROM workshop_users WHERE workshop_id = ?');

const mapUser = (row) =>
  row
    ? {
        id: row.id,
        workshopId: row.workshop_id,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role || 'workshop',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;

const hashPassword = (password) => bcrypt.hashSync(password, 10);

export function getWorkshopUserByEmail(email) {
  if (!email) {
    return null;
  }
  return mapUser(selectByEmailStmt.get(email));
}

export function getWorkshopUserByWorkshopId(workshopId) {
  if (!workshopId) {
    return null;
  }
  return mapUser(selectByWorkshopStmt.get(workshopId));
}

export function createWorkshopAccount({ workshopId, email, password }) {
  if (!workshopId || !email || !password) {
    throw new Error('Missing workshop account data');
  }
  const timestamp = new Date().toISOString();
  insertStmt.run({
    workshopId,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    timestamp
  });
  return getWorkshopUserByWorkshopId(workshopId);
}

export function upsertWorkshopAccount({ workshopId, email, password }) {
  const existing = getWorkshopUserByWorkshopId(workshopId);
  if (!existing) {
    if (!email || !password) {
      return null;
    }
    return createWorkshopAccount({ workshopId, email, password });
  }

  const fields = [];
  const params = { workshopId, timestamp: new Date().toISOString() };
  if (email) {
    fields.push('email = @email');
    params.email = email.toLowerCase();
  }
  if (password) {
    fields.push('password_hash = @passwordHash');
    params.passwordHash = hashPassword(password);
  }
  if (!fields.length) {
    return existing;
  }

  const stmt = updateEmailStmt(fields);
  stmt.run(params);
  return getWorkshopUserByWorkshopId(workshopId);
}

export function deleteWorkshopAccount(workshopId) {
  if (!workshopId) return;
  deleteByWorkshopStmt.run(workshopId);
}
