import { listWorkshops } from '../src/services/workshopsService.js';
import { upsertWorkshopAccount } from '../src/services/workshopUsersService.js';

const FALLBACK_DOMAIN = 'warsztatplus.local';
const DEFAULT_PASSWORD = 'warsztat123';

const rows = listWorkshops().map((workshop) => {
  const fallbackEmail = `warsztat${workshop.id}@${FALLBACK_DOMAIN}`;
  const loginEmail = (workshop.loginEmail || workshop.email || fallbackEmail).toLowerCase();
  upsertWorkshopAccount({ workshopId: workshop.id, email: loginEmail, password: DEFAULT_PASSWORD });
  return {
    id: workshop.id,
    name: workshop.name,
    loginEmail,
    password: DEFAULT_PASSWORD
  };
});

console.table(rows);
