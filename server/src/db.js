import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const migrations = `
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vin TEXT NOT NULL,
  registration_number TEXT,
  workshop_name TEXT,
  workshop_id INTEGER,
  mileage_km INTEGER,
  first_registration_date TEXT,
  status TEXT DEFAULT 'W trakcie',
  approval_status TEXT DEFAULT 'pending',
  summary TEXT,
  moderation_note TEXT,
  moderated_by TEXT,
  moderated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id)
);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  actor_email TEXT,
  payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workshops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  subscription_amount REAL,
  subscription_start_date TEXT,
  subscription_initial_amount REAL,
  subscription_initial_note TEXT,
  billing_email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workshop_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workshop_id INTEGER NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'workshop',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workshop_billing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workshop_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  amount REAL,
  invoice_number TEXT,
  status TEXT DEFAULT 'unpaid',
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE
);
`;

db.exec(migrations);

const ensureReportWorkshopRelation = () => {
  const columns = db.prepare('PRAGMA table_info(reports)').all();
  const hasWorkshopId = columns.some((column) => column.name === 'workshop_id');
  if (!hasWorkshopId) {
    db.exec('ALTER TABLE reports ADD COLUMN workshop_id INTEGER REFERENCES workshops(id)');
  }
};

ensureReportWorkshopRelation();

const ensureWorkshopAdditionalColumns = () => {
  const columns = db.prepare('PRAGMA table_info(workshops)').all();
  const hasColumn = (name) => columns.some((column) => column.name === name);
  const addColumn = (name, type) => {
    if (!hasColumn(name)) {
      db.exec(`ALTER TABLE workshops ADD COLUMN ${name} ${type}`);
    }
  };

  addColumn('subscription_amount', 'REAL');
  addColumn('subscription_start_date', 'TEXT');
  addColumn('subscription_initial_amount', 'REAL');
  addColumn('subscription_initial_note', 'TEXT');
  addColumn('billing_email', 'TEXT');
};

ensureWorkshopAdditionalColumns();

// ==========================================
// NOWE TABELE: Części i Zamówienia (Dodane przez Tech Leada)
// ==========================================

const ensurePartsTables = () => {
  const partsMigration = `
    CREATE TABLE IF NOT EXISTS parts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT, -- np. numer katalogowy
      price REAL NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workshop_id INTEGER NOT NULL,
      part_name TEXT NOT NULL,
      part_index TEXT,
      price REAL,
      quantity INTEGER DEFAULT 1,
      status TEXT DEFAULT 'new', -- new, pending, completed, cancelled
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    );
  `;
  db.exec(partsMigration);

  // Dodajmy przykładowe dane, jeśli tabela części jest pusta (Seed)
  const count = db.prepare('SELECT count(*) as count FROM parts').get();
  if (count.count === 0) {
    console.log('Seedowanie tabeli parts...');
    const insert = db.prepare('INSERT INTO parts (name, code, price, stock_quantity) VALUES (?, ?, ?, ?)');
    insert.run('Klocki hamulcowe przód (TRW)', 'GDB1307', 145.00, 10);
    insert.run('Filtr oleju (Mann)', 'W712/95', 35.50, 50);
    insert.run('Amortyzator tył (Sachs)', '313 000', 210.00, 4);
    insert.run('Wycieraczki Bosch Aerotwin', '3 397 007', 95.00, 20);
    insert.run('Zestaw paska rozrządu', 'CT1139K2', 450.00, 2);
  }
};

ensurePartsTables();

export { db };
