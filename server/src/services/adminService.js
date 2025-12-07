import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { config } from '../config.js';

const insertAdminStmt = db.prepare('INSERT INTO admins (email, password_hash) VALUES (?, ?)');
const findAdminStmt = db.prepare('SELECT * FROM admins WHERE email = ?');

export async function ensureDefaultAdmin() {
  const existing = findAdminStmt.get(config.adminEmail);
  if (existing) return;

  const hash = await bcrypt.hash(config.adminPassword, 10);
  insertAdminStmt.run(config.adminEmail, hash);
}

export function getAdminByEmail(email) {
  return findAdminStmt.get(email);
}
