import { db } from '../db.js';

const insertStmt = db.prepare(`
  INSERT INTO audit_logs (type, message, actor_email, payload, created_at)
  VALUES (@type, @message, @actorEmail, @payload, @createdAt)
`);

const listStmt = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?');

export function logAction({ type, message, actorEmail = null, payload = null }) {
  const createdAt = new Date().toISOString();
  insertStmt.run({
    type,
    message,
    actorEmail,
    payload: payload ? JSON.stringify(payload) : null,
    createdAt
  });
}

export function listLogs(limit = 100) {
  return listStmt.all(limit).map((row) => ({
    id: row.id,
    type: row.type,
    message: row.message,
    actorEmail: row.actor_email,
    payload: row.payload ? safeParse(row.payload) : null,
    createdAt: row.created_at
  }));
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}
