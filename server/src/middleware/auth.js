import { verifyToken } from '../services/authService.js';

const ensureAuth = (req, res, allowedRoles = []) => {
  const header = req.headers.authorization;
  if (!header) {
    res.status(401).json({ message: 'Missing Authorization header' });
    return null;
  }

  const [, token] = header.split(' ');
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ message: 'Invalid token' });
    return null;
  }

  if (allowedRoles.length && !allowedRoles.includes(payload.role)) {
    res.status(403).json({ message: 'Insufficient permissions' });
    return null;
  }

  return payload;
};

export function requireAuth(req, res, next) {
  const payload = ensureAuth(req, res, ['admin']);
  if (!payload) {
    return;
  }
  req.user = payload;
  next();
}

export function requireWorkshop(req, res, next) {
  const payload = ensureAuth(req, res, ['workshop']);
  if (!payload) {
    return;
  }
  req.user = payload;
  next();
}

export function requireAnyUser(req, res, next) {
  const payload = ensureAuth(req, res, ['admin', 'workshop']);
  if (!payload) {
    return;
  }
  req.user = payload;
  next();
}
