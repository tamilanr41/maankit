import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { fail } from '../utils/http.js';

const COOKIE = 'mkm_admin';
const ADMIN_SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const isProduction = () => process.env.NODE_ENV === 'production';
// Netlify and Render use different sites, so production cookies must be
// SameSite=None unless the API and site share a custom parent domain.
const sameSite = () => process.env.ADMIN_COOKIE_SAME_SITE || (isProduction() ? 'none' : 'lax');
const cookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: sameSite(),
  path: '/',
  maxAge: ADMIN_SESSION_MAX_AGE,
});
export function setAdminCookie(res, admin) {
  const token = jwt.sign({ sub: admin.id, role: admin.role?.name || 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '30d', issuer: 'mann-ki-mannat' });
  res.cookie(COOKIE, token, cookieOptions());
}
export function clearAdminCookie(res) { res.clearCookie(COOKIE, { httpOnly: true, secure: isProduction(), sameSite: sameSite(), path: '/' }); }

export async function requireAdmin(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return fail(res, 401, 'Administrator sign-in required.');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'mann-ki-mannat' });
    const admin = await prisma.adminUser.findFirst({ where: { id: payload.sub, active: true }, select: { id: true, name: true, email: true, active: true, role: { select: { name: true } } } });
    if (!admin) return fail(res, 401, 'Administrator session is no longer active.');
    req.admin = admin;
    next();
  } catch {
    return fail(res, 401, 'Administrator session is invalid or has expired.');
  }
}
export function requireOwner(req, res, next) {
  if (req.admin?.role?.name !== 'OWNER') return fail(res, 403, 'Owner access is required for this action.');
  next();
}
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.admin?.role?.name)) return fail(res, 403, 'Your administrator role does not have access to this action.');
    next();
  };
}

export function requireAdminCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-CSRF-Protection') !== '1') return fail(res, 403, 'This request could not be verified. Refresh the page and try again.');
  next();
}
