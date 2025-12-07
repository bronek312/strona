import { db } from '../db.js';

const listStmt = db.prepare('SELECT * FROM news ORDER BY published_at DESC');
const createStmt = db.prepare('INSERT INTO news (title, body) VALUES (?, ?)');
const deleteStmt = db.prepare('DELETE FROM news WHERE id = ?');

export function listNews() {
  return listStmt.all();
}

export function createNews({ title, body }) {
  const result = createStmt.run(title, body);
  return { id: result.lastInsertRowid, title, body };
}

export function deleteNews(id) {
  deleteStmt.run(id);
}
