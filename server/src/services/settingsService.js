import { db } from '../db.js';

const upsertStmt = db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES (@key, @value, @updatedAt)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`);

const selectAllStmt = db.prepare('SELECT key, value FROM settings');

const DEFAULT_SETTINGS = {
  licenseMonths: 12,
  statusOptions: ['Przyjeta', 'W trakcie', 'Zakonczona']
};

function mapSettings(rows) {
  const result = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (!row) continue;
    if (row.key === 'licenseMonths') {
      result.licenseMonths = Number(row.value) || DEFAULT_SETTINGS.licenseMonths;
    } else if (row.key === 'statusOptions') {
      try {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
          result.statusOptions = parsed;
        }
      } catch (error) {
        // ignore
      }
    }
  }
  return result;
}

export function getSettings() {
  const rows = selectAllStmt.all();
  return mapSettings(rows);
}

export function updateSettings(partial) {
  const next = { ...getSettings(), ...partial };
  const updatedAt = new Date().toISOString();
  const entries = [
    { key: 'licenseMonths', value: String(next.licenseMonths) },
    { key: 'statusOptions', value: JSON.stringify(next.statusOptions) }
  ];
  const txn = db.transaction((records) => {
    records.forEach((record) => {
      upsertStmt.run({ ...record, updatedAt });
    });
  });
  txn(entries);
  return next;
}

export function ensureDefaultSettings() {
  const current = selectAllStmt.all();
  if (current.length === 0) {
    updateSettings(DEFAULT_SETTINGS);
  }
}
