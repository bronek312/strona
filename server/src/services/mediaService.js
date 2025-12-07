import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db.js';
import { config } from '../config.js';

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const insertStmt = db.prepare('INSERT INTO media (file_name, file_path, mime_type, size) VALUES (?, ?, ?, ?)');
const listStmt = db.prepare('SELECT * FROM media ORDER BY uploaded_at DESC');
const deleteStmt = db.prepare('DELETE FROM media WHERE id = ?');
const findStmt = db.prepare('SELECT * FROM media WHERE id = ?');

export function saveMedia(meta) {
  const result = insertStmt.run(meta.fileName, meta.filePath, meta.mimeType, meta.size);
  return { id: result.lastInsertRowid, ...meta };
}

export function listMedia() {
  return listStmt.all();
}

export function getMediaById(id) {
  return findStmt.get(id);
}

export function deleteMedia(id) {
  const media = getMediaById(id);
  if (media && fs.existsSync(media.file_path)) {
    fs.unlinkSync(media.file_path);
  }
  deleteStmt.run(id);
}

export function resolveMediaPath(fileName) {
  return path.join(config.uploadDir, fileName);
}
