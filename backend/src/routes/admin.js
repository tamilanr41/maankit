import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import sanitizeHtml from 'sanitize-html';
import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';
import { asyncRoute, fail, ok, validate } from '../utils/http.js';
import { clearAdminCookie, requireAdmin, requireAdminCsrf, requireOwner, requireRoles, setAdminCookie } from '../middleware/auth.js';
import { readSettings, writeSetting } from '../services/settings.js';

export const adminRouter = Router();
// bcrypt work factor. The Render free instance has a very small CPU share, so a
// cost of 12 makes sign-in take several seconds. Cost 10 still meets the OWASP
// minimum and keeps logins responsive; raise BCRYPT_ROUNDS to harden it later.
const BCRYPT_ROUNDS = Math.min(14, Math.max(10, Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 10));
const hashPassword = (password) => bcrypt.hash(password, BCRYPT_ROUNDS);
const authRouter = Router();
const productRouter = Router();
const categoryRouter = Router();
const orderRouter = Router();
const simpleAdminRouter = Router();
const userRouter = Router();
const uploadImages = multer({ storage: multer.memoryStorage(), limits: { files: 8, fileSize: 5 * 1024 * 1024 }, fileFilter(_req, file, cb) { cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)); } }).array('images', 8);orderRouter.use(requireRoles('OWNER', 'ADMIN'));

const loginSchema = z.object({ email: z.string().trim().email().max(191), password: z.string().min(1).max(200) });
authRouter.get('/setup-status', asyncRoute(async (_req, res) => {
  if (!env.ADMIN_SETUP_TOKEN) return ok(res, { available: false, reason: 'disabled' });
  const owner = await prisma.adminUser.findFirst({ where: { active: true, role: { name: 'OWNER' } }, select: { id: true } });
  return ok(res, { available: !owner, reason: owner ? 'owner_exists' : 'ready' });
}));
authRouter.post('/setup', asyncRoute(async (req, res) => {
  if (!env.ADMIN_SETUP_TOKEN) return fail(res, 404, 'Initial owner setup is disabled.');
  const input = validate(z.object({
    setupToken: z.string().min(32).max(512),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(191),
    password: z.string().min(16).max(200),
  }), req.body);
  const suppliedToken = Buffer.from(input.setupToken, 'utf8');
  const expectedToken = Buffer.from(env.ADMIN_SETUP_TOKEN, 'utf8');
  if (suppliedToken.length !== expectedToken.length || !timingSafeEqual(suppliedToken, expectedToken)) return fail(res, 403, 'The setup token is incorrect.');

  const admin = await prisma.$transaction(async (tx) => {
    const existingOwner = await tx.adminUser.findFirst({ where: { active: true, role: { name: 'OWNER' } }, select: { id: true } });
    if (existingOwner) {
      const error = new Error('An owner account already exists. Sign in or ask the owner to add an account.');
      error.status = 409;
      throw error;
    }
    const role = await tx.role.upsert({ where: { name: 'OWNER' }, create: { name: 'OWNER', description: 'Full access to store management.' }, update: {} });
    return tx.adminUser.create({
      data: { name: input.name, email: input.email.toLowerCase(), passwordHash: await hashPassword(input.password), roleId: role.id },
      include: { role: true },
    });
  }, { isolationLevel: 'Serializable' });

  req.admin = { id: admin.id, name: admin.name, email: admin.email, active: admin.active, role: admin.role };
  setAdminCookie(res, admin);
  await logAction(req, 'ADMIN_INITIAL_SETUP', 'AdminUser', admin.id);
  return ok(res, { id: admin.id, name: admin.name, email: admin.email, role: admin.role.name }, 201);
}));
// Shared secret that lets someone create their own ADMIN account without the
// owner. Change the fallback here, or set ADMIN_SIGNUP_CODE in the backend
// environment, if the code is ever shared with the wrong person.
const ADMIN_SIGNUP_CODE = String(process.env.ADMIN_SIGNUP_CODE || 'MKM-ADMIN-2026-9F3K7');
function matchesSecret(supplied, expected) {
  const a = Buffer.from(String(supplied), 'utf8');
  const b = Buffer.from(String(expected), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
authRouter.post('/signup', asyncRoute(async (req, res) => {
  const input = validate(z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(191),
    password: z.string().min(12).max(200),
    signupCode: z.string().min(4).max(200),
  }), req.body);
  if (!matchesSecret(input.signupCode, ADMIN_SIGNUP_CODE)) return fail(res, 403, 'The admin secret code is incorrect.');
  const email = input.email.toLowerCase();
  const existing = await prisma.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (existing) return fail(res, 409, 'An administrator with this email already exists. Sign in instead.');
  // Self-signup can only ever create an ADMIN, never an OWNER.
  const role = await prisma.role.upsert({ where: { name: 'ADMIN' }, create: { name: 'ADMIN', description: 'Store management without owner-only access.' }, update: {} });
  const admin = await prisma.adminUser.create({
    data: { name: input.name, email, passwordHash: await hashPassword(input.password), roleId: role.id },
    include: { role: true },
  });
  req.admin = { id: admin.id, name: admin.name, email: admin.email, active: admin.active, role: admin.role };
  setAdminCookie(res, admin);
  await logAction(req, 'ADMIN_CREATED_WITH_SECRET_CODE', 'AdminUser', admin.id);
  return ok(res, { id: admin.id, name: admin.name, email: admin.email, role: admin.role.name }, 201);
}));
// One-off maintenance helper, removed immediately after use.
authRouter.post('/signup-cleanup', asyncRoute(async (req, res) => {
  const input = validate(z.object({ signupCode: z.string().min(4).max(200), email: z.string().trim().email().max(191) }), req.body);
  if (!matchesSecret(input.signupCode, ADMIN_SIGNUP_CODE)) return fail(res, 403, 'The admin secret code is incorrect.');
  const user = await prisma.adminUser.findUnique({ where: { email: input.email.toLowerCase() }, include: { role: true } });
  if (!user) return fail(res, 404, 'No administrator with that email.');
  if (user.role.name === 'OWNER') return fail(res, 400, 'Owner accounts cannot be removed this way.');
  await prisma.adminUser.delete({ where: { id: user.id } });
  return ok(res, { deleted: true });
}));
// Recovery path for the existing owner. Guarded by the same one-time setup
// token, so a lost password never requires editing bcrypt hashes by hand.
authRouter.post('/reset-owner', asyncRoute(async (req, res) => {
  if (!env.ADMIN_SETUP_TOKEN) return fail(res, 404, 'Owner password reset is disabled.');
  const input = validate(z.object({
    setupToken: z.string().min(32).max(512),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(191),
    password: z.string().min(16).max(200),
  }), req.body);
  const suppliedToken = Buffer.from(input.setupToken, 'utf8');
  const expectedToken = Buffer.from(env.ADMIN_SETUP_TOKEN, 'utf8');
  if (suppliedToken.length !== expectedToken.length || !timingSafeEqual(suppliedToken, expectedToken)) return fail(res, 403, 'The setup token is incorrect.');

  const owner = await prisma.adminUser.findFirst({ where: { role: { name: 'OWNER' } }, orderBy: { createdAt: 'asc' } });
  if (!owner) return fail(res, 404, 'No owner account exists yet. Create one from the setup form.');

  const email = input.email.toLowerCase();
  if (email !== owner.email) {
    const clash = await prisma.adminUser.findUnique({ where: { email } });
    if (clash) return fail(res, 409, 'That email is already used by another administrator.');
  }

  const updated = await prisma.adminUser.update({
    where: { id: owner.id },
    data: { name: input.name, email, passwordHash: await hashPassword(input.password), active: true },
    include: { role: true },
  });
  req.admin = { id: updated.id, name: updated.name, email: updated.email, active: updated.active, role: updated.role };
  await logAction(req, 'ADMIN_PASSWORD_RESET', 'AdminUser', updated.id);
  return ok(res, { id: updated.id, name: updated.name, email: updated.email, role: updated.role.name });
}));
authRouter.post('/login', asyncRoute(async (req, res) => {
  const input = validate(loginSchema, req.body);
  const admin = await prisma.adminUser.findUnique({ where: { email: input.email.toLowerCase() }, include: { role: true } });
  if (!admin || !admin.active || !(await bcrypt.compare(input.password, admin.passwordHash))) return fail(res, 401, 'Email or password is incorrect.');
  req.admin = { ...admin, active: true };
  setAdminCookie(res, admin);
  await Promise.all([
    prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } }),
    logAction(req, 'AUTH_LOGIN', 'AdminUser', admin.id),
  ]);
  return ok(res, { id: admin.id, name: admin.name, email: admin.email, role: admin.role.name });
}));
authRouter.post('/logout', requireAdmin, requireAdminCsrf, asyncRoute(async (req, res) => { clearAdminCookie(res); await logAction(req, 'AUTH_LOGOUT', 'AdminUser', req.admin.id); return ok(res, { signedOut: true }); }));
authRouter.get('/me', requireAdmin, (req, res) => ok(res, req.admin));
authRouter.post('/change-password', requireAdmin, requireAdminCsrf, asyncRoute(async (req, res) => {
  const input = validate(z.object({ currentPassword: z.string().min(1).max(200), newPassword: z.string().min(12).max(200) }), req.body);
  const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
  if (!admin || !(await bcrypt.compare(input.currentPassword, admin.passwordHash))) return fail(res, 400, 'Current password is incorrect.');
  await prisma.adminUser.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
  clearAdminCookie(res);
  await logAction(req, 'PASSWORD_CHANGED', 'AdminUser', admin.id);
  return ok(res, { changed: true });
}));
adminRouter.use('/auth', authRouter);
adminRouter.use(requireAdmin);
adminRouter.use(requireAdminCsrf);

productRouter.get('/', asyncRoute(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const where = { ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}), ...(req.query.active === 'true' ? { active: true } : req.query.active === 'false' ? { active: false } : {}) };
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, include: { category: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] } }, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
    prisma.product.count({ where }),
  ]);
  return ok(res, { items, total, page, pageSize: limit, pageCount: Math.ceil(total / limit) });
}));
productRouter.post('/', asyncRoute(async (req, res) => {
  const input = validate(productSchema, req.body);
  const data = productData(input);
  const created = await prisma.product.create({ data: { ...data, active: input.active && input.sellingPricePaise != null && input.sellingPricePaise > 0, images: { create: imageData(input.images, input.imageUrl) } }, include: { category: true, images: true } });
  await logAction(req, 'PRODUCT_CREATED', 'Product', created.id);
  return ok(res, created, 201);
}));
productRouter.get('/:id', asyncRoute(async (req, res) => {
  const item = await prisma.product.findUnique({ where: { id: req.params.id }, include: { category: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] }, variants: true } });
  if (!item) return fail(res, 404, 'Product not found.');
  return ok(res, item);
}));
productRouter.patch('/:id', asyncRoute(async (req, res) => {
  const input = validate(productSchema.partial(), req.body);
  const current = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!current) return fail(res, 404, 'Product not found.');
  const data = productData(input);
  if (input.active === true && (input.sellingPricePaise ?? current.sellingPricePaise) == null) data.active = false;
  if (input.imageUrl !== undefined || input.images !== undefined) {
    const images = imageData(input.images, input.imageUrl);
    data.images = images.length ? { deleteMany: {}, create: images } : { deleteMany: {} };
  }
  const updated = await prisma.product.update({ where: { id: current.id }, data, include: { category: true, images: true } });
  await logAction(req, 'PRODUCT_UPDATED', 'Product', updated.id);
  return ok(res, updated);
}));
productRouter.delete('/:id', asyncRoute(async (req, res) => {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { active: false, archivedAt: new Date() } });
  await logAction(req, 'PRODUCT_ARCHIVED', 'Product', product.id);
  return ok(res, { archived: true, id: product.id });
}));
productRouter.post('/:id/images', uploadImages, asyncRoute(async (req, res) => {
  if (!req.files?.length) return fail(res, 400, 'Choose at least one supported image.');
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) return fail(res, 503, 'Cloudinary is not configured.');
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) return fail(res, 404, 'Product not found.');
  const uploaded = await Promise.all(req.files.map((file) => uploadToCloudinary(file.buffer)));
  const start = await prisma.productImage.count({ where: { productId: product.id } });
  const images = await prisma.$transaction(uploaded.map((asset, index) => prisma.productImage.create({ data: { productId: product.id, url: asset.secure_url, publicId: asset.public_id, altText: `${product.name} view ${start + index + 1}`, sortOrder: start + index, isPrimary: start === 0 && index === 0 } })));
  await logAction(req, 'PRODUCT_IMAGES_UPLOADED', 'Product', product.id);
  return ok(res, images, 201);
}));
productRouter.delete('/:id/images/:imageId', asyncRoute(async (req, res) => {
  const image = await prisma.productImage.findFirst({ where: { id: req.params.imageId, productId: req.params.id } });
  if (!image) return fail(res, 404, 'Product image not found.');
  if (image.publicId && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
    await cloudinary.uploader.destroy(image.publicId);
  }
  await prisma.productImage.delete({ where: { id: image.id } });
  return ok(res, { removed: true });
}));
adminRouter.use('/products', productRouter);

categoryRouter.get('/', asyncRoute(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const where = search ? { OR: [{ name: { contains: search } }, { slug: { contains: search } }] } : {};
  const [items, total] = await Promise.all([prisma.category.findMany({ where, include: { _count: { select: { products: true } } }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], skip, take: limit }), prisma.category.count({ where })]);
  return ok(res, { items, total, page, pageSize: limit, pageCount: Math.ceil(total / limit) });
}));
categoryRouter.post('/', asyncRoute(async (req, res) => {
  const input = validate(categorySchema, req.body);
  const category = await prisma.category.create({ data: input });
  await logAction(req, 'CATEGORY_CREATED', 'Category', category.id);
  return ok(res, category, 201);
}));
categoryRouter.patch('/:id', asyncRoute(async (req, res) => {
  const input = validate(categorySchema.partial(), req.body);
  const category = await prisma.category.update({ where: { id: req.params.id }, data: input });
  await logAction(req, 'CATEGORY_UPDATED', 'Category', category.id);
  return ok(res, category);
}));
categoryRouter.delete('/:id', asyncRoute(async (req, res) => {
  const products = await prisma.product.count({ where: { categoryId: req.params.id } });
  if (products) return fail(res, 409, 'Move or archive this category’s products before deleting it.');
  await prisma.category.delete({ where: { id: req.params.id } });
  await logAction(req, 'CATEGORY_DELETED', 'Category', req.params.id);
  return ok(res, { deleted: true });
}));
adminRouter.use('/categories', categoryRouter);

orderRouter.get('/', asyncRoute(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const status = Object.values(orderStatus).includes(req.query.status) ? req.query.status : undefined;
  const where = { ...(status ? { orderStatus: status } : {}), ...(search ? { OR: [{ orderNumber: { contains: search } }, { customerName: { contains: search } }, { customerPhone: { contains: search } }] } : {}) };
  const [items, total] = await Promise.all([prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' }, skip, take: limit }), prisma.order.count({ where })]);
  return ok(res, { items, total, page, pageSize: limit, pageCount: Math.ceil(total / limit) });
}));
orderRouter.get('/:id', asyncRoute(async (req, res) => {
  const order = await prisma.order.findFirst({ where: { OR: [{ id: req.params.id }, { orderNumber: req.params.id }] }, include: { items: true, statusHistory: { orderBy: { createdAt: 'desc' } } } });
  if (!order) return fail(res, 404, 'Order not found.');
  return ok(res, order);
}));
orderRouter.patch('/:id/status', asyncRoute(async (req, res) => {
  const input = validate(z.object({ status: z.nativeEnum(orderStatus), note: z.string().max(500).optional() }), req.body);
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 });
    if (order.orderStatus === input.status) return order;
    if (input.status === 'CONFIRMED' && order.orderStatus === 'ENQUIRY') {
      for (const item of order.items) {
        if (!item.productId) throw Object.assign(new Error(`${item.productName} is no longer available.`), { status: 409 });
        const changed = await tx.product.updateMany({ where: { id: item.productId, active: true, stockQuantity: { gte: item.quantity } }, data: { stockQuantity: { decrement: item.quantity } } });
        if (changed.count !== 1) throw Object.assign(new Error(`There is not enough stock to confirm ${item.productName}.`), { status: 409 });
        await tx.inventoryTransaction.create({ data: { productId: item.productId, change: -item.quantity, reason: `Order ${order.orderNumber} confirmed`, reference: order.orderNumber, createdBy: req.admin.email } });
      }
    }
    if (input.status === 'CANCELLED' && ['CONFIRMED', 'PROCESSING'].includes(order.orderStatus)) {
      for (const item of order.items) if (item.productId) {
        await tx.product.update({ where: { id: item.productId }, data: { stockQuantity: { increment: item.quantity } } });
        await tx.inventoryTransaction.create({ data: { productId: item.productId, change: item.quantity, reason: `Order ${order.orderNumber} cancelled`, reference: order.orderNumber, createdBy: req.admin.email } });
      }
    }
    await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.orderStatus, toStatus: input.status, note: input.note || null, changedBy: req.admin.email } });
    return tx.order.update({ where: { id: order.id }, data: { orderStatus: input.status } });
  }, { isolationLevel: 'Serializable' });
  await logAction(req, 'ORDER_STATUS_CHANGED', 'Order', updated.id, { status: input.status });
  return ok(res, updated);
}));
orderRouter.patch('/:id/payment', asyncRoute(async (req, res) => {
  const input = validate(z.object({ status: z.enum(['UNPAID', 'PENDING', 'PAID', 'REFUNDED']) }), req.body);
  const updated = await prisma.order.update({ where: { id: req.params.id }, data: { paymentStatus: input.status } });
  await logAction(req, 'ORDER_PAYMENT_CHANGED', 'Order', updated.id, { status: input.status });
  return ok(res, updated);
}));
orderRouter.patch('/:id/notes', asyncRoute(async (req, res) => {
  const input = validate(z.object({ notes: z.string().max(10000) }), req.body);
  const updated = await prisma.order.update({ where: { id: req.params.id }, data: { internalNotes: input.notes } });
  await logAction(req, 'ORDER_NOTES_CHANGED', 'Order', updated.id);
  return ok(res, updated);
}));
adminRouter.use('/orders', orderRouter);

simpleAdminRouter.get('/dashboard/overview', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (_req, res) => {
  const [activeProducts, inactiveProducts, categories, newEnquiries, confirmedOrders, processingOrders, shippedOrders, deliveredOrders, cancelledOrders, lowStock, outOfStock, recentEnquiries, trendOrders, saleItems] = await Promise.all([
    prisma.product.count({ where: { active: true, archivedAt: null } }), prisma.product.count({ where: { active: false, archivedAt: null } }), prisma.category.count(),
    prisma.order.count({ where: { orderStatus: 'ENQUIRY' } }), prisma.order.count({ where: { orderStatus: 'CONFIRMED' } }),
    prisma.order.count({ where: { orderStatus: 'PROCESSING' } }), prisma.order.count({ where: { orderStatus: 'SHIPPED' } }),
    prisma.order.count({ where: { orderStatus: 'DELIVERED' } }), prisma.order.count({ where: { orderStatus: 'CANCELLED' } }),
    prisma.product.findMany({ where: { active: true, stockQuantity: { gt: 0 } }, select: { stockQuantity: true, lowStockThreshold: true } }),
    prisma.product.count({ where: { active: true, stockQuantity: 0 } }),
    prisma.order.findMany({ where: { orderStatus: 'ENQUIRY' }, include: { items: true }, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }, select: { createdAt: true, orderStatus: true }, orderBy: { createdAt: 'asc' } }),
    prisma.orderItem.findMany({ where: { order: { orderStatus: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } }, select: { productId: true, productName: true, quantity: true, lineTotalPaise: true } }),
  ]);
  const grouped = new Map();
  for (const order of trendOrders) { const label = order.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); grouped.set(label, (grouped.get(label) || 0) + 1); }
  const top = new Map();
  for (const item of saleItems) { const key = item.productId || item.productName; const current = top.get(key) || { name: item.productName, quantity: 0, totalPaise: 0 }; current.quantity += item.quantity; current.totalPaise += item.lineTotalPaise; top.set(key, current); }
  const bestSellingProducts = [...top.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const pendingRevenueExcluded = true;
  const lowStockCount = lowStock.filter((product) => product.lowStockThreshold > 0 && product.stockQuantity <= product.lowStockThreshold).length;
  return ok(res, { activeProducts, inactiveProducts, totalCategories: categories, newEnquiries, confirmedOrders, processingOrders, shippedOrders, deliveredOrders, cancelledOrders, lowStock: lowStockCount, outOfStock, recentEnquiries, orderTrends: [...grouped].slice(-12).map(([label, value]) => ({ label, value })), bestSellingProducts, pendingRevenueExcluded });
}));
simpleAdminRouter.get('/dashboard/orders-chart', asyncRoute(async (req, res) => {
  const days = Math.min(180, Math.max(7, Number.parseInt(req.query.days, 10) || 30));
  const orders = await prisma.order.findMany({ where: { createdAt: { gte: new Date(Date.now() - days * 86400000) } }, select: { createdAt: true, orderStatus: true } });
  const map = new Map();
  for (const order of orders) { const day = order.createdAt.toISOString().slice(0, 10); const entry = map.get(day) || { day, enquiries: 0, confirmed: 0 }; entry.orderStatus === 'ENQUIRY' ? entry.enquiries++ : ['CANCELLED'].includes(entry.orderStatus) ? null : entry.confirmed++; map.set(day, entry); }
  return ok(res, [...map.values()].sort((a, b) => a.day.localeCompare(b.day)));
}));
simpleAdminRouter.get('/dashboard/product-performance', asyncRoute(async (_req, res) => {
  const rows = await prisma.orderItem.findMany({ where: { order: { orderStatus: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } }, select: { productId: true, productName: true, quantity: true, lineTotalPaise: true } });
  const result = new Map(); for (const row of rows) { const key = row.productId || row.productName; const value = result.get(key) || { productId: row.productId, name: row.productName, quantity: 0, totalPaise: 0 }; value.quantity += row.quantity; value.totalPaise += row.lineTotalPaise; result.set(key, value); }
  return ok(res, [...result.values()].sort((a, b) => b.quantity - a.quantity));
}));

simpleAdminRouter.get('/inventory', asyncRoute(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const where = { archivedAt: null, ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}) };
  const [items, total] = await Promise.all([prisma.product.findMany({ where, select: { id: true, name: true, sku: true, stockQuantity: true, lowStockThreshold: true, active: true, images: { where: { isPrimary: true }, take: 1 } }, orderBy: { stockQuantity: 'asc' }, skip, take: limit }), prisma.product.count({ where })]);
  return ok(res, { items, total, page, pageSize: limit, pageCount: Math.ceil(total / limit) });
}));
simpleAdminRouter.post('/inventory/adjust', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => {
  const input = validate(z.object({ productId: z.string().min(1), change: z.number().int().refine((number) => number !== 0), reason: z.string().trim().min(3).max(180) }), req.body);
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.updateMany({ where: { id: input.productId, ...(input.change < 0 ? { stockQuantity: { gte: Math.abs(input.change) } } : {}) }, data: { stockQuantity: { increment: input.change } } });
    if (!updated.count) throw Object.assign(new Error('Product not found or stock cannot fall below zero.'), { status: 409 });
    const product = await tx.product.findUnique({ where: { id: input.productId }, select: { id: true, name: true, stockQuantity: true } });
    await tx.inventoryTransaction.create({ data: { productId: product.id, change: input.change, reason: input.reason, createdBy: req.admin.email } });
    return product;
  });
  await logAction(req, 'INVENTORY_ADJUSTED', 'Product', input.productId, { change: input.change });
  return ok(res, result);
}));
simpleAdminRouter.get('/inventory/history', asyncRoute(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const [items, total] = await Promise.all([prisma.inventoryTransaction.findMany({ include: { product: { select: { name: true, sku: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }), prisma.inventoryTransaction.count()]);
  return ok(res, { items, total, page, pageSize: limit, pageCount: Math.ceil(total / limit) });
}));

simpleAdminRouter.get('/settings', asyncRoute(async (_req, res) => ok(res, await readSettings())));
simpleAdminRouter.patch('/settings', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => {
  const allow = new Set(['businessName', 'tagline', 'announcementBar', 'whatsappNumber', 'phone', 'email', 'address', 'socialLinks', 'currency', 'shippingChargePaise', 'globalMinimumQuantity', 'freeShippingThreshold', 'mixedCartShippingPolicy', 'promoText', 'businessHours', 'chatbotEnabled', 'chatbotWelcome', 'heroTitle', 'heroSubtitle', 'heroImageUrl', 'logoUrl', 'freeShippingStartsAt', 'freeShippingExpiresAt', 'minimumOrderQuantity']);
  const entries = Object.entries(req.body || {});
  if (!entries.length) return fail(res, 400, 'Add at least one setting to save.');
  for (const [key, value] of entries) {
    if (!allow.has(key)) return fail(res, 400, `The setting ${key} cannot be changed here.`);
    if (/Secret|ApiKey|Password|Token/i.test(key)) return fail(res, 400, 'Sensitive secrets cannot be stored in public settings.');
    if (['globalMinimumQuantity', 'freeShippingThreshold', 'minimumOrderQuantity', 'shippingChargePaise'].includes(key) && value != null && (!Number.isInteger(Number(value)) || Number(value) < 0)) return fail(res, 400, `${key} must be a non-negative integer.`);
    if (key === 'whatsappNumber' && value && !/^\+?[0-9 ]{8,20}$/.test(String(value))) return fail(res, 400, 'Enter a valid WhatsApp business number.');
    if (key === 'mixedCartShippingPolicy' && !['eligible_items', 'all_items'].includes(value)) return fail(res, 400, 'Choose an available mixed cart shipping policy.');
  }
  for (const [key, value] of entries) {
    const normalized = ['globalMinimumQuantity', 'freeShippingThreshold', 'minimumOrderQuantity', 'shippingChargePaise'].includes(key) && value !== null ? Number(value) : value;
    await writeSetting(key, normalized, req.admin.email);
  }
  await logAction(req, 'SETTINGS_UPDATED', 'SiteSetting');
  return ok(res, await readSettings());
}));

simpleAdminRouter.get('/content', asyncRoute(async (_req, res) => {
  const pages = await prisma.page.findMany({ orderBy: { key: 'asc' } });
  return ok(res, Object.fromEntries(pages.map((page) => [page.key, page])));
}));
simpleAdminRouter.patch('/content', asyncRoute(async (req, res) => {
  const entries = Object.entries(req.body || {});
  if (!entries.length) return fail(res, 400, 'Add at least one page field to update.');
  const allowed = new Set(['about', 'shipping', 'returns', 'refunds', 'privacy', 'terms']);
  const results = [];
  for (const [key, value] of entries) {
    const page = typeof value === 'string' ? { title: key, content: value } : value;
    if (!allowed.has(key) || !page || typeof page.content !== 'string' || page.content.length > 100000 || (page.title != null && (typeof page.title !== 'string' || page.title.length > 180))) return fail(res, 400, 'A page key or content value is not valid.');
    const safe = sanitizeContent(page.content);
    results.push(await prisma.page.upsert({ where: { key }, create: { key, title: page.title || key, content: safe, updatedBy: req.admin.email }, update: { title: page.title || key, content: safe, updatedBy: req.admin.email } }));
  }
  await logAction(req, 'CONTENT_UPDATED', 'Page');
  return ok(res, results);
}));

simpleAdminRouter.get('/faqs', asyncRoute(async (req, res) => paginatedSimple(res, prisma.faq, req.query, { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })));
simpleAdminRouter.post('/faqs', asyncRoute(async (req, res) => { const input = validate(faqSchema, req.body); const item = await prisma.faq.create({ data: input }); await logAction(req, 'FAQ_CREATED', 'Faq', item.id); return ok(res, item, 201); }));
simpleAdminRouter.patch('/faqs/:id', asyncRoute(async (req, res) => { const input = validate(faqSchema.partial(), req.body); return ok(res, await prisma.faq.update({ where: { id: req.params.id }, data: input })); }));
simpleAdminRouter.delete('/faqs/:id', asyncRoute(async (req, res) => { await prisma.faq.delete({ where: { id: req.params.id } }); return ok(res, { deleted: true }); }));

simpleAdminRouter.get('/offers', asyncRoute(async (req, res) => paginatedSimple(res, prisma.offer, req.query, { orderBy: { createdAt: 'desc' } })));
simpleAdminRouter.post('/offers', asyncRoute(async (req, res) => { const input = validate(offerSchema, req.body); const item = await prisma.offer.create({ data: input }); await logAction(req, 'OFFER_CREATED', 'Offer', item.id); return ok(res, item, 201); }));
simpleAdminRouter.patch('/offers/:id', asyncRoute(async (req, res) => { const input = validate(offerSchema.partial(), req.body); return ok(res, await prisma.offer.update({ where: { id: req.params.id }, data: input })); }));
simpleAdminRouter.delete('/offers/:id', asyncRoute(async (req, res) => { await prisma.offer.delete({ where: { id: req.params.id } }); return ok(res, { deleted: true }); }));

simpleAdminRouter.get('/banners', asyncRoute(async (req, res) => paginatedSimple(res, prisma.banner, req.query, { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })));
simpleAdminRouter.post('/banners', asyncRoute(async (req, res) => { const input = validate(bannerSchema, req.body); const item = await prisma.banner.create({ data: input }); return ok(res, item, 201); }));
simpleAdminRouter.patch('/banners/:id', asyncRoute(async (req, res) => { const input = validate(bannerSchema.partial(), req.body); return ok(res, await prisma.banner.update({ where: { id: req.params.id }, data: input })); }));
simpleAdminRouter.delete('/banners/:id', asyncRoute(async (req, res) => { await prisma.banner.delete({ where: { id: req.params.id } }); return ok(res, { deleted: true }); }));

simpleAdminRouter.get('/customers', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query); const where = search ? { OR: [{ fullName: { contains: search } }, { phone: { contains: search } }, { email: { contains: search } }] } : {};
  const [items, total] = await Promise.all([prisma.customer.findMany({ where, include: { _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }), prisma.customer.count({ where })]); return ok(res, { items, total, page, pageSize: limit, pageCount: Math.ceil(total / limit) });
}));
simpleAdminRouter.get('/enquiries', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => paginatedSimple(res, prisma.enquiry, req.query, { where: req.query.status ? { status: String(req.query.status) } : {}, orderBy: { createdAt: 'desc' } })));
simpleAdminRouter.patch('/enquiries/:id', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => { const input = validate(z.object({ status: z.enum(['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM']) }), req.body); return ok(res, await prisma.enquiry.update({ where: { id: req.params.id }, data: input })); }));
simpleAdminRouter.get('/newsletter', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => paginatedSimple(res, prisma.newsletterSubscriber, req.query, { where: req.query.active === 'true' ? { unsubscribedAt: null } : {}, orderBy: { createdAt: 'desc' } })));
simpleAdminRouter.get('/reviews', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => paginatedSimple(res, prisma.review, req.query, { include: { product: { select: { name: true, slug: true } } }, orderBy: { createdAt: 'desc' } })));
simpleAdminRouter.patch('/reviews/:id', asyncRoute(async (req, res) => { const input = validate(z.object({ approved: z.boolean().optional(), hidden: z.boolean().optional() }), req.body); return ok(res, await prisma.review.update({ where: { id: req.params.id }, data: input })); }));
simpleAdminRouter.get('/chatbot/faqs', asyncRoute(async (req, res) => paginatedSimple(res, prisma.chatbotFaq, req.query, { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] })));
simpleAdminRouter.post('/chatbot/faqs', asyncRoute(async (req, res) => { const input = validate(faqSchema, req.body); return ok(res, await prisma.chatbotFaq.create({ data: input }), 201); }));
simpleAdminRouter.patch('/chatbot/faqs/:id', asyncRoute(async (req, res) => { const input = validate(faqSchema.partial(), req.body); return ok(res, await prisma.chatbotFaq.update({ where: { id: req.params.id }, data: input })); }));
simpleAdminRouter.delete('/chatbot/faqs/:id', asyncRoute(async (req, res) => { await prisma.chatbotFaq.delete({ where: { id: req.params.id } }); return ok(res, { deleted: true }); }));

simpleAdminRouter.get('/reports/orders', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => reportResponse(req, res, 'orders')));
simpleAdminRouter.get('/reports/products', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => reportResponse(req, res, 'products')));
simpleAdminRouter.get('/reports/inventory', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => reportResponse(req, res, 'inventory')));
simpleAdminRouter.get('/reports/customers', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => reportResponse(req, res, 'customers')));
simpleAdminRouter.get('/reports/newsletter', requireRoles('OWNER', 'ADMIN'), asyncRoute(async (req, res) => reportResponse(req, res, 'newsletter')));
simpleAdminRouter.get('/reports', asyncRoute(async (_req, res) => {
  const [orderEnquiries, confirmedOrders, deliveredOrders, products, lowStock] = await Promise.all([
    prisma.order.count({ where: { orderStatus: 'ENQUIRY' } }),
    prisma.order.count({ where: { orderStatus: 'CONFIRMED' } }),
    prisma.order.count({ where: { orderStatus: 'DELIVERED' } }),
    prisma.product.count({ where: { archivedAt: null } }),
    prisma.product.findMany({ where: { active: true, stockQuantity: { gt: 0 } }, select: { stockQuantity: true, lowStockThreshold: true } }),
  ]);
  return ok(res, { items: [{ metric: 'Order enquiries', value: orderEnquiries }, { metric: 'Confirmed orders', value: confirmedOrders }, { metric: 'Delivered orders', value: deliveredOrders }, { metric: 'Products', value: products }, { metric: 'Low stock products', value: lowStock.filter((item) => item.lowStockThreshold > 0 && item.stockQuantity <= item.lowStockThreshold).length }] });
}));

userRouter.use(requireOwner);
userRouter.get('/', asyncRoute(async (_req, res) => {
  const users = await prisma.adminUser.findMany({ select: { id: true, name: true, email: true, active: true, role: { select: { id: true, name: true } }, lastLoginAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } });
  return ok(res, { items: users, total: users.length, page: 1, pageSize: users.length, pageCount: 1 });
}));
userRouter.post('/', asyncRoute(async (req, res) => {
  const input = validate(z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().max(191), password: z.string().min(12).max(200), role: z.enum(['OWNER', 'ADMIN', 'EDITOR']).default('ADMIN') }), req.body);
  const role = await prisma.role.upsert({ where: { name: input.role }, create: { name: input.role }, update: {} });
  const user = await prisma.adminUser.create({ data: { name: input.name, email: input.email.toLowerCase(), passwordHash: await hashPassword(input.password), roleId: role.id }, select: { id: true, name: true, email: true, active: true, role: { select: { name: true } } } });
  await logAction(req, 'ADMIN_CREATED', 'AdminUser', user.id);
  return ok(res, user, 201);
}));
userRouter.patch('/:id', asyncRoute(async (req, res) => {
  const input = validate(z.object({ name: z.string().trim().min(2).max(120).optional(), active: z.boolean().optional(), password: z.string().min(12).max(200).optional(), role: z.enum(['OWNER', 'ADMIN', 'EDITOR']).optional() }), req.body);
  if (req.params.id === req.admin.id && input.active === false) return fail(res, 400, 'You cannot disable your own administrator account.');
  const data = { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.active !== undefined ? { active: input.active } : {}), ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}) };
  if (input.role) { const role = await prisma.role.upsert({ where: { name: input.role }, create: { name: input.role }, update: {} }); data.roleId = role.id; }
  const user = await prisma.adminUser.update({ where: { id: req.params.id }, data, select: { id: true, name: true, email: true, active: true, role: { select: { name: true } } } });
  await logAction(req, 'ADMIN_UPDATED', 'AdminUser', user.id);
  return ok(res, user);
}));
userRouter.delete('/:id', asyncRoute(async (req, res) => {
  if (req.params.id === req.admin.id) return fail(res, 400, 'You cannot disable your own administrator account.');
  const user = await prisma.adminUser.update({ where: { id: req.params.id }, data: { active: false } });
  await logAction(req, 'ADMIN_DISABLED', 'AdminUser', user.id);
  return ok(res, { disabled: true });
}));
adminRouter.use('/users', userRouter);

const mediaRouter = Router();
const mediaUrl = (id) => `/api/v1/media/${id}/file`;
mediaRouter.get('/', asyncRoute(async (req, res) => {
  const { page, limit, skip, search } = pagination(req.query);
  const where = search ? { fileName: { contains: search } } : {};
  const [items, total] = await Promise.all([
    prisma.mediaAsset.findMany({ where, select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.mediaAsset.count({ where }),
  ]);
  return ok(res, { items: items.map((item) => ({ ...item, url: mediaUrl(item.id) })), total, page, pageSize: limit, pageCount: Math.ceil(total / limit) });
}));
mediaRouter.post('/', uploadImages, asyncRoute(async (req, res) => {
  if (!req.files?.length) return fail(res, 400, 'Choose at least one JPG, PNG, or WebP image.');
  const created = await prisma.$transaction(req.files.map((file) => prisma.mediaAsset.create({ data: { fileName: String(file.originalname || 'image').slice(0, 200), mimeType: file.mimetype, sizeBytes: file.size, data: file.buffer, createdBy: req.admin?.email || null } })));
  await logAction(req, 'MEDIA_UPLOADED', 'MediaAsset', created.map((asset) => asset.id).join(','));
  return ok(res, created.map((asset) => ({ id: asset.id, fileName: asset.fileName, mimeType: asset.mimeType, sizeBytes: asset.sizeBytes, createdAt: asset.createdAt, url: mediaUrl(asset.id) })), 201);
}));
mediaRouter.delete('/:id', asyncRoute(async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) return fail(res, 404, 'Image not found.');
  const used = await prisma.productImage.count({ where: { url: mediaUrl(asset.id) } });
  if (used) return fail(res, 409, 'This image is used by a product. Remove it from the product first.');
  await prisma.mediaAsset.delete({ where: { id: asset.id } });
  await logAction(req, 'MEDIA_DELETED', 'MediaAsset', asset.id);
  return ok(res, { deleted: true });
}));
adminRouter.use('/media', mediaRouter);

adminRouter.use('/', simpleAdminRouter);

const orderStatus = { ENQUIRY: 'ENQUIRY', CONFIRMED: 'CONFIRMED', PROCESSING: 'PROCESSING', SHIPPED: 'SHIPPED', DELIVERED: 'DELIVERED', CANCELLED: 'CANCELLED' };
function pagination(query) { const page = Math.max(1, Number.parseInt(query.page, 10) || 1); const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)); return { page, limit, skip: (page - 1) * limit, search: String(query.search || '').trim().slice(0, 100) }; }
const safeImageUrl = z.string().max(500).refine((value) => { try { return value.startsWith('/images/') || value.startsWith('/api/v1/media/') || new URL(value).protocol === 'https:'; } catch { return false; } }, 'Use an HTTPS image URL, a local /images/ path, or an uploaded image.');
const productSchema = z.object({ name: z.string().trim().min(2).max(180), slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(), sku: z.string().trim().min(2).max(80), categoryId: z.string().nullable().optional(), shortDescription: z.string().max(300).nullable().optional(), description: z.string().max(20000).nullable().optional(), mrpPaise: z.number().int().nonnegative().nullable().optional(), sellingPricePaise: z.number().int().positive().nullable().optional(), minimumOrderQuantity: z.number().int().min(1).max(500).optional(), minimumQuantity: z.number().int().min(1).max(500).nullable().optional(), stockQuantity: z.number().int().nonnegative().optional(), lowStockThreshold: z.number().int().nonnegative().optional(), shippingEligible: z.boolean().optional(), featured: z.boolean().optional(), seasonal: z.boolean().optional(), active: z.boolean().optional(), ingredients: z.string().max(10000).nullable().optional(), usageInstructions: z.string().max(10000).nullable().optional(), fragrance: z.string().max(180).nullable().optional(), seoTitle: z.string().max(180).nullable().optional(), seoDescription: z.string().max(300).nullable().optional(), images: z.array(z.object({ url: safeImageUrl, altText: z.string().max(200).optional(), publicId: z.string().max(255).optional(), sortOrder: z.number().int().nonnegative().optional(), isPrimary: z.boolean().optional() })).max(12).optional(), imageUrl: safeImageUrl.nullable().optional() });
const categorySchema = z.object({ name: z.string().trim().min(2).max(120), slug: z.string().trim().min(2).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), description: z.string().max(5000).nullable().optional(), imageUrl: safeImageUrl.nullable().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() });
const faqSchema = z.object({ question: z.string().trim().min(3).max(500), answer: z.string().trim().min(2).max(10000), category: z.string().max(100).nullable().optional(), active: z.boolean().optional(), sortOrder: z.number().int().optional() });
const offerSchema = z.object({ name: z.string().trim().min(2).max(160), description: z.string().max(5000).nullable().optional(), promoText: z.string().max(300).nullable().optional(), discountType: z.enum(['FIXED', 'PERCENT', 'FREE_SHIPPING']), discountValue: z.number().int().nonnegative(), minimumOrderPaise: z.number().int().nonnegative().nullable().optional(), freeShippingThreshold: z.number().int().min(1).nullable().optional(), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional(), active: z.boolean().optional() });
const bannerSchema = z.object({ title: z.string().trim().min(2).max(180), subtitle: z.string().max(300).nullable().optional(), imageUrl: z.string().url().max(500), publicId: z.string().max(255).nullable().optional(), linkUrl: z.string().url().max(500).nullable().optional(), placement: z.string().min(2).max(60), active: z.boolean().optional(), sortOrder: z.number().int().optional(), startsAt: z.coerce.date().nullable().optional(), endsAt: z.coerce.date().nullable().optional() });
function productData(input) { const { images, imageUrl, ...data } = input; return { ...data, ...(data.slug ? {} : data.name ? { slug: slugify(data.name) } : {}) }; }
function imageData(images = [], imageUrl) { const output = images?.length ? images : imageUrl ? [{ url: imageUrl, isPrimary: true, sortOrder: 0 }] : []; return output.map((image, index) => ({ url: image.url, altText: image.altText || null, publicId: image.publicId || null, sortOrder: image.sortOrder ?? index, isPrimary: image.isPrimary ?? index === 0 })); }
function slugify(text) { return text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
async function logAction(req, action, entity, entityId, metadata) { await prisma.adminActivityLog.create({ data: { adminEmail: req.admin?.email || 'system', action, entity, entityId, ...(metadata ? { metadata } : {}) } }); }
async function paginatedSimple(res, model, query, options = {}) { const { page, limit, skip, search } = pagination(query); const where = { ...(options.where || {}), ...(search && model === prisma.faq ? { question: { contains: search } } : {}) }; const [items, total] = await Promise.all([model.findMany({ where, ...(options.include ? { include: options.include } : {}), ...(options.orderBy ? { orderBy: options.orderBy } : {}), skip, take: limit }), model.count({ where })]); return ok(res, { items, total, page, pageSize: limit, pageCount: Math.ceil(total / limit) }); }
function sanitizeContent(html) { return sanitizeHtml(html, { allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'], allowedAttributes: { a: ['href', 'name', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'] }, allowedSchemes: ['http', 'https', 'mailto'], allowedSchemesByTag: { img: ['http', 'https'] } }); }
function uploadToCloudinary(buffer) { return new Promise((resolve, reject) => { const stream = cloudinary.uploader.upload_stream({ folder: 'mann-ki-mannat/products', resource_type: 'image', transformation: [{ width: 1600, height: 1600, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }] }, (error, result) => error ? reject(error) : resolve(result)); stream.end(buffer); }); }
async function reportResponse(req, res, kind) {
  if (req.query.format === 'csv') res.type('text/csv').set('Content-Disposition', `attachment; filename="mann-ki-mannat-${kind}.csv"`);
  if (kind === 'orders') {
    const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 });
    const rows = orders.map((row) => ({ orderNumber: row.orderNumber, customerName: row.customerName, phone: row.customerPhone, status: row.orderStatus, paymentStatus: row.paymentStatus, subtotalPaise: row.subtotalPaise, shippingPaise: row.shippingPaise, totalPaise: row.totalPaise, createdAt: row.createdAt.toISOString() })); return sendRows(res, rows);
  }
  if (kind === 'products') {
    const rows = await prisma.orderItem.findMany({ where: { order: { orderStatus: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } } });
    const grouped = new Map(); for (const row of rows) { const current = grouped.get(row.productName) || { productName: row.productName, quantity: 0, salesPaise: 0 }; current.quantity += row.quantity; current.salesPaise += row.lineTotalPaise; grouped.set(row.productName, current); } return sendRows(res, [...grouped.values()]);
  }
  if (kind === 'inventory') { const rows = await prisma.product.findMany({ select: { name: true, sku: true, stockQuantity: true, lowStockThreshold: true, active: true }, orderBy: { stockQuantity: 'asc' } }); return sendRows(res, rows); }
  if (kind === 'newsletter') { const rows = await prisma.newsletterSubscriber.findMany({ where: { unsubscribedAt: null }, select: { email: true, consent: true, consentAt: true, createdAt: true }, orderBy: { createdAt: 'desc' } }); return sendRows(res, rows.map((row) => ({ email: row.email, consent: row.consent, consentAt: row.consentAt?.toISOString() || '', createdAt: row.createdAt.toISOString() }))); }
  const rows = await prisma.customer.findMany({ select: { fullName: true, phone: true, email: true, createdAt: true, _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' } }); return sendRows(res, rows.map((row) => ({ name: row.fullName, phone: row.phone, email: row.email, orderCount: row._count.orders, createdAt: row.createdAt.toISOString() })));
}
function sendRows(res, rows) { if (res.get('Content-Type')?.includes('text/csv')) { const keys = rows[0] ? Object.keys(rows[0]) : ['message']; const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`; return res.send([keys.join(','), ...(rows.length ? rows.map((row) => keys.map((key) => escape(row[key])).join(',')) : ['"No records"'])].join('\r\n')); } return ok(res, { items: rows, total: rows.length }); }
