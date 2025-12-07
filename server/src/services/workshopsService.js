import { db } from '../db.js';
import { createWorkshopAccount, getWorkshopUserByWorkshopId } from './workshopUsersService.js';

const FIELD_COLUMN_MAP = {
  name: 'name',
  address: 'address',
  city: 'city',
  phone: 'phone',
  email: 'email',
  status: 'status',
  notes: 'notes',
  subscriptionAmount: 'subscription_amount',
  subscriptionStartDate: 'subscription_start_date',
  subscriptionInitialAmount: 'subscription_initial_amount',
  subscriptionInitialNote: 'subscription_initial_note',
  billingEmail: 'billing_email'
};

const insertStmt = db.prepare(`
  INSERT INTO workshops (
    name,
    address,
    city,
    phone,
    email,
    status,
    notes,
    subscription_amount,
    subscription_start_date,
    subscription_initial_amount,
    subscription_initial_note,
    billing_email,
    created_at,
    updated_at
  )
  VALUES (
    @name,
    @address,
    @city,
    @phone,
    @email,
    @status,
    @notes,
    @subscriptionAmount,
    @subscriptionStartDate,
    @subscriptionInitialAmount,
    @subscriptionInitialNote,
    @billingEmail,
    @createdAt,
    @updatedAt
  )
`);

const baseSelect = `
  SELECT w.*, wu.email AS login_email
  FROM workshops w
  LEFT JOIN workshop_users wu ON wu.workshop_id = w.id
`;

const selectAllStmt = db.prepare(`${baseSelect} ORDER BY w.name ASC`);
const selectActiveStmt = db.prepare(`${baseSelect} WHERE w.status = 'active' ORDER BY w.name ASC`);
const selectByIdStmt = db.prepare(`${baseSelect} WHERE w.id = ?`);
const countStmt = db.prepare('SELECT COUNT(*) as count FROM workshops');
const deleteStmt = db.prepare('DELETE FROM workshops WHERE id = ?');

const buildUpdateStatement = (keys) => {
  const assignments = keys.map((key) => `${FIELD_COLUMN_MAP[key]} = @${key}`);
  return db.prepare(`UPDATE workshops SET ${assignments.join(', ')}, updated_at = @updatedAt WHERE id = @id`);
};

const mapWorkshop = (row) =>
  row
    ? {
        id: row.id,
        name: row.name,
        address: row.address,
        city: row.city,
        phone: row.phone,
        email: row.email,
        loginEmail: row.login_email || null,
        status: row.status,
        notes: row.notes,
        subscriptionAmount:
          typeof row.subscription_amount === 'number' ? Number(row.subscription_amount) : null,
        subscriptionStartDate: row.subscription_start_date || null,
        subscriptionInitialAmount:
          typeof row.subscription_initial_amount === 'number' ? Number(row.subscription_initial_amount) : null,
        subscriptionInitialNote: row.subscription_initial_note || null,
        billingEmail: row.billing_email || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    : null;

export function listWorkshops() {
  return selectAllStmt.all().map(mapWorkshop);
}

export function listActiveWorkshops() {
  return selectActiveStmt.all().map(mapWorkshop);
}

export function getWorkshopById(id) {
  return mapWorkshop(selectByIdStmt.get(id));
}

export function createWorkshop(payload) {
  const now = new Date().toISOString();
  const params = {
    name: payload.name.trim(),
    address: payload.address?.trim() || null,
    city: payload.city?.trim() || null,
    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,
    status: payload.status || 'active',
    notes: payload.notes?.trim() || null,
    subscriptionAmount: typeof payload.subscriptionAmount === 'number' ? payload.subscriptionAmount : null,
    subscriptionStartDate: payload.subscriptionStartDate || null,
    subscriptionInitialAmount:
      typeof payload.subscriptionInitialAmount === 'number' ? payload.subscriptionInitialAmount : null,
    subscriptionInitialNote: payload.subscriptionInitialNote || null,
    billingEmail: payload.billingEmail || null,
    createdAt: now,
    updatedAt: now
  };

  const result = insertStmt.run(params);
  return getWorkshopById(result.lastInsertRowid);
}

export function updateWorkshop(id, updates) {
  const entries = Object.entries(updates).filter(([key, value]) => FIELD_COLUMN_MAP[key] && typeof value !== 'undefined');
  if (!entries.length) {
    return getWorkshopById(id);
  }

  const params = entries.reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: typeof value === 'string' ? value.trim() : value
    }),
    { id, updatedAt: new Date().toISOString() }
  );

  const stmt = buildUpdateStatement(entries.map(([key]) => key));
  stmt.run(params);
  return getWorkshopById(id);
}

export function ensureDefaultWorkshops() {
  const { count } = countStmt.get();
  if (count > 0) return;

  const now = new Date().toISOString();
  const defaults = [
    {
      name: 'Warsztat+ Centralny',
      address: 'ul. Mechaników 12',
      city: 'Kraków',
      phone: '+48 123 456 789',
      email: 'biuro@warsztatplus.pl',
      status: 'active',
      notes: 'Autoryzowany punkt kontroli jakości Warsztat+.'
    },
    {
      name: 'Auto Serwis Północ',
      address: 'ul. Przemysłowa 8',
      city: 'Gdańsk',
      phone: '+48 58 000 11 22',
      email: 'kontakt@autoserwispolnoc.pl',
      status: 'active',
      notes: 'Specjalizacja: silniki i diagnostyka komputerowa.'
    },
    {
      name: 'Garage 24/7',
      address: 'al. Solidarności 21',
      city: 'Warszawa',
      phone: '+48 22 111 22 33',
      email: 'support@garage247.pl',
      status: 'inactive',
      notes: 'W trakcie modernizacji infrastruktury.'
    }
  ];

  const insertMany = db.prepare(`
    INSERT INTO workshops (name, address, city, phone, email, status, notes, created_at, updated_at)
    VALUES (@name, @address, @city, @phone, @email, @status, @notes, @createdAt, @updatedAt)
  `);

  const insertTxn = db.transaction((rows) => {
    for (const row of rows) {
      insertMany.run({ ...row, createdAt: now, updatedAt: now });
    }
  });

  insertTxn(defaults);

  const seeded = listWorkshops();
  seeded.forEach((workshop, index) => {
    const hasAccount = getWorkshopUserByWorkshopId(workshop.id);
    if (!hasAccount) {
      const email = workshop.email || `warsztat${index + 1}@warsztatplus.local`;
      createWorkshopAccount({ workshopId: workshop.id, email, password: 'warsztat123' });
    }
  });
}

export function deleteWorkshop(id) {
  if (!id) {
    return;
  }
  deleteStmt.run(id);
}
