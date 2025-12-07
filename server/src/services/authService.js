import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config.js';
import { getAdminByEmail } from './adminService.js';
import { getWorkshopUserByEmail } from './workshopUsersService.js';
import { logAction } from './auditService.js';

export async function login(email, password) {
  const admin = getAdminByEmail(email);
  if (admin) {
    const match = await bcrypt.compare(password, admin.password_hash);
    if (match) {
      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: 'admin' },
        config.jwtSecret,
        { expiresIn: '12h' }
      );
      logAction({
        type: 'auth:login:admin',
        message: 'Administrator zalogowal sie do panelu',
        actorEmail: admin.email,
        payload: { adminId: admin.id }
      });
      return { token, email: admin.email, role: 'admin' };
    }
  }

  const workshopUser = getWorkshopUserByEmail(email);
  if (workshopUser) {
    const match = await bcrypt.compare(password, workshopUser.passwordHash);
    if (match) {
      const token = jwt.sign(
        { id: workshopUser.id, email: workshopUser.email, role: 'workshop', workshopId: workshopUser.workshopId },
        config.jwtSecret,
        { expiresIn: '12h' }
      );
      logAction({
        type: 'auth:login:workshop',
        message: 'Warsztat zalogowal sie do panelu',
        actorEmail: workshopUser.email,
        payload: { workshopId: workshopUser.workshopId }
      });
      return { token, email: workshopUser.email, role: 'workshop', workshopId: workshopUser.workshopId };
    }
  }

  return null;
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}
