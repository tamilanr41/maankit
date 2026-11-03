import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { asyncRoute, fail, ok, validate } from '../utils/http.js';
import { calculateOrder } from '../services/pricing.js';
import { readSettings } from '../services/settings.js';

export const publicRouter = Router();
const emailSchema = z.string().trim().email().max(191);
const customerPhone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.');
const checkoutSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: customerPhone,
  email: z.union([emailSchema, z.literal('')]).optional(),
  address: z.string().trim().min(8).max(2000),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pinCode: z.string().trim().regex(/^\d{6}$/),
  instructions: z.string().trim().max(1000).optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(500) })).min(1).max(40),
  website: z.string().optional(),
});

const publicProductSelect = {
  id: true, name: true, slug: true, sku: true, description: true, shortDescription: true,
  mrpPaise: true, sellingPricePaise: true, minimumOrderQuantity: true, minimumQuantity: true,
  stockQuantity: true, lowStockThreshold: true, shippingEligible: true, featured: true,
  seasonal: true, fragrance: true, ingredients: true, usageInstructions: true,
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], select: { id: true, url: true, altText: true, isPrimary: true } },
};

publicRouter.get('/media/:id/file', asyncRoute(async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id }, select: { data: true, mimeType: true } });
  if (!asset) return fail(res, 404, 'Image not found.');
  res.set('Content-Type', asset.mimeType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  // Product pages and the admin run on a different origin (Netlify), so the
  // global same-origin resource policy must be relaxed for these images.
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  return res.send(Buffer.from(asset.data));
}));

publicRouter.get('/products', asyncRoute(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12));
  const where = { active: true, archivedAt: null, sellingPricePaise: { gt: 0 } };
  const search = String(req.query.search || '').trim().slice(0, 100);
  if (search) where.OR = [
    { name: { contains: search } }, { sku: { contains: search } },
    { shortDescription: { contains: search } }, { description: { contains: search } },
  ];
  if (req.query.category) where.category = { slug: String(req.query.category).slice(0, 150) };
  if (req.query.featured === 'true') where.featured = true;
  if (req.query.seasonal === 'true') where.seasonal = true;
  if (req.query.available === 'true') where.stockQuantity = { gt: 0 };
  if (req.query.minPrice || req.query.maxPrice) where.sellingPricePaise = {
    gt: 0,
    ...(req.query.minPrice ? { gte: Math.max(0, Number(req.query.minPrice)) } : {}),
    ...(req.query.maxPrice ? { lte: Math.max(0, Number(req.query.maxPrice)) } : {}),
  };
  const sort = String(req.query.sort || 'newest');
  const orderBy = sort === 'price-asc' ? { sellingPricePaise: 'asc' }
    : sort === 'price-desc' ? { sellingPricePaise: 'desc' }
      : sort === 'popular' ? { orderItems: { _count: 'desc' } }
        : [{ featured: 'desc' }, { createdAt: 'desc' }];
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, select: publicProductSelect, orderBy, skip: (page - 1) * limit, take: limit }),
    prisma.product.count({ where }),
  ]);
  return ok(res, { items, total, page, pageSize: limit, pageCount: Math.ceil(total / limit) });
}));

publicRouter.get('/products/featured', asyncRoute(async (_req, res) => {
  const items = await prisma.product.findMany({ where: { active: true, archivedAt: null, featured: true, sellingPricePaise: { gt: 0 } }, select: publicProductSelect, orderBy: { createdAt: 'desc' }, take: 12 });
  return ok(res, items);
}));
publicRouter.get('/products/best-sellers', asyncRoute(async (_req, res) => {
  const leaders = await prisma.orderItem.groupBy({ by: ['productId'], where: { productId: { not: null }, order: { orderStatus: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } }, _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 12 });
  const ids = leaders.map((item) => item.productId).filter(Boolean);
  if (!ids.length) return ok(res, []);
  const records = await prisma.product.findMany({ where: { id: { in: ids }, active: true, archivedAt: null, sellingPricePaise: { gt: 0 } }, select: publicProductSelect });
  const rank = new Map(ids.map((id, index) => [id, index]));
  records.sort((a, b) => rank.get(a.id) - rank.get(b.id));
  return ok(res, records);
}));
publicRouter.get('/products/search', asyncRoute(async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 100);
  if (!q) return ok(res, []);
  const items = await prisma.product.findMany({ where: { active: true, archivedAt: null, sellingPricePaise: { gt: 0 }, OR: [{ name: { contains: q } }, { sku: { contains: q } }, { shortDescription: { contains: q } }] }, select: publicProductSelect, take: 12 });
  return ok(res, items);
}));
publicRouter.get('/products/:slug', asyncRoute(async (req, res) => {
  const product = await prisma.product.findFirst({ where: { slug: req.params.slug, active: true, archivedAt: null, sellingPricePaise: { gt: 0 } }, select: { ...publicProductSelect, variants: { where: { active: true }, select: { id: true, name: true, sku: true, mrpPaise: true, sellingPricePaise: true, stockQuantity: true } }, reviews: { where: { approved: true, hidden: false }, select: { id: true, name: true, rating: true, title: true, body: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 12 } } });
  if (!product) return fail(res, 404, 'This product is not available.');
  return ok(res, product);
}));
publicRouter.get('/categories', asyncRoute(async (_req, res) => {
  const categories = await prisma.category.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true, description: true, imageUrl: true, _count: { select: { products: { where: { active: true, sellingPricePaise: { gt: 0 } } } } } } });
  return ok(res, categories.map((category) => ({ ...category, image: category.imageUrl, productCount: category._count.products })));
}));
publicRouter.get('/categories/:slug', asyncRoute(async (req, res) => {
  const category = await prisma.category.findFirst({ where: { slug: req.params.slug, active: true }, select: { id: true, name: true, slug: true, description: true, imageUrl: true } });
  if (!category) return fail(res, 404, 'This collection is not available.');
  return ok(res, category);
}));
publicRouter.get('/banners', asyncRoute(async (req, res) => {
  const now = new Date();
  const banners = await prisma.banner.findMany({ where: { active: true, ...(req.query.placement ? { placement: String(req.query.placement) } : {}), AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] }, orderBy: { sortOrder: 'asc' } });
  return ok(res, banners);
}));
publicRouter.get('/settings/public', asyncRoute(async (_req, res) => {
  const settings = await readSettings();
  const publicKeys = ['businessName', 'tagline', 'announcementBar', 'whatsappNumber', 'phone', 'email', 'address', 'socialLinks', 'currency', 'shippingChargePaise', 'globalMinimumQuantity', 'freeShippingThreshold', 'promoText', 'businessHours', 'chatbotEnabled', 'chatbotWelcome', 'heroTitle', 'heroSubtitle', 'heroImageUrl'];
  const visible = Object.fromEntries(Object.entries(settings).filter(([key]) => publicKeys.includes(key)));
  if (!visible.whatsappNumber && process.env.WHATSAPP_BUSINESS_NUMBER) visible.whatsappNumber = process.env.WHATSAPP_BUSINESS_NUMBER;
  return ok(res, visible);
}));
publicRouter.get('/faqs', asyncRoute(async (_req, res) => {
  const faqs = await prisma.faq.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, question: true, answer: true, category: true } });
  return ok(res, faqs);
}));
publicRouter.get('/content', asyncRoute(async (_req, res) => {
  const pages = await prisma.page.findMany({ where: { active: true }, select: { key: true, title: true, content: true, seoTitle: true, seoDescription: true } });
  return ok(res, Object.fromEntries(pages.map((page) => [page.key, page.content])));
}));

publicRouter.post('/newsletter/subscribe', asyncRoute(async (req, res) => {
  const input = validate(z.object({ email: emailSchema, consent: z.literal(true) }), req.body);
  const subscriber = await prisma.newsletterSubscriber.upsert({ where: { email: input.email.toLowerCase() }, create: { email: input.email.toLowerCase(), consent: true, consentAt: new Date() }, update: { consent: true, consentAt: new Date(), unsubscribedAt: null } });
  return ok(res, { subscribed: true, id: subscriber.id, unsubscribeToken: subscriber.unsubscribeToken }, 201);
}));
publicRouter.post('/newsletter/unsubscribe', asyncRoute(async (req, res) => {
  const input = validate(z.object({ token: z.string().min(16).max(64) }), req.body);
  const subscriber = await prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: input.token } });
  if (!subscriber) return fail(res, 404, 'This unsubscribe link is not valid.');
  await prisma.newsletterSubscriber.update({ where: { id: subscriber.id }, data: { unsubscribedAt: new Date() } });
  return ok(res, { unsubscribed: true });
}));

publicRouter.post('/enquiries', asyncRoute(async (req, res) => {
  const input = validate(z.object({ name: z.string().trim().min(2).max(160), email: emailSchema, phone: z.string().trim().max(24).optional(), subject: z.string().trim().min(2).max(180), message: z.string().trim().min(10).max(5000), website: z.string().optional() }), req.body);
  if (input.website) return ok(res, { received: true }, 201);
  const enquiry = await prisma.enquiry.create({ data: { name: input.name, email: input.email.toLowerCase(), phone: input.phone || null, subject: input.subject, message: input.message } });
  return ok(res, { received: true, reference: enquiry.id }, 201);
}));

publicRouter.post('/reviews', asyncRoute(async (req, res) => {
  const input = validate(z.object({ productId: z.string().min(1), orderNumber: z.string().min(8), phone: customerPhone, name: z.string().trim().min(2).max(120), rating: z.number().int().min(1).max(5), title: z.string().trim().max(180).optional(), body: z.string().trim().min(10).max(3000) }), req.body);
  const order = await prisma.order.findFirst({ where: { orderNumber: input.orderNumber, customerPhone: input.phone, orderStatus: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }, items: { some: { productId: input.productId } } } });
  if (!order) return fail(res, 403, 'A review can be submitted only for a verified order.');
  const review = await prisma.review.create({ data: { productId: input.productId, name: input.name, rating: input.rating, title: input.title || null, body: input.body, approved: false } });
  return ok(res, { submitted: true, reviewId: review.id, message: 'Thank you. Your review will appear after moderation.' }, 201);
}));

publicRouter.post('/checkout/validate', asyncRoute(async (req, res) => {
  const items = validate(z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(500) })).min(1).max(40), req.body.items);
  const products = await prisma.product.findMany({ where: { id: { in: items.map((item) => item.productId) } } });
  const calculation = await calculateOrder(products, items);
  return ok(res, { subtotalPaise: calculation.subtotalPaise, shippingPaise: calculation.shippingPaise, discountPaise: calculation.discountPaise, totalPaise: calculation.totalPaise, freeShipping: calculation.freeShipping, qualifyingUnits: calculation.qualifyingUnits, threshold: calculation.threshold, items: calculation.lines.map(({ product, quantity, lineTotalPaise }) => ({ productId: product.id, name: product.name, quantity, sellingPricePaise: product.sellingPricePaise, lineTotalPaise })) });
}));

publicRouter.post('/orders', asyncRoute(async (req, res) => {
  const input = validate(checkoutSchema, req.body);
  if (input.website) return fail(res, 400, 'The order could not be created.');
  const idempotencyKey = String(req.get('Idempotency-Key') || '').slice(0, 120);
  if (idempotencyKey.length < 16) return fail(res, 400, 'A valid order submission key is required. Please refresh and try again.');
  const existing = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true } });
  if (existing) return ok(res, await orderResponse(existing));

  const uniqueIds = [...new Set(input.items.map((item) => item.productId))];
  if (uniqueIds.length !== input.items.length) return fail(res, 400, 'Each product must appear only once in the bag.');

  // Price the cart and load settings before the write transaction opens. This
  // keeps the transaction to three quick inserts instead of holding a lock
  // across several network round trips to the database.
  const products = await prisma.product.findMany({ where: { id: { in: uniqueIds } } });
  const calc = await calculateOrder(products, input.items);
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const reference = `MKM-${date}-${randomBytes(5).toString('hex').toUpperCase()}`;

  // A deadlock on a busy database is safe to retry: nothing has been committed.
  const order = await withTransactionRetry(() => prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({ where: { phone: input.phone }, create: { fullName: input.fullName, phone: input.phone, email: input.email || null }, update: { fullName: input.fullName, email: input.email || null } });
    await tx.address.create({ data: { customerId: customer.id, address: input.address, city: input.city, state: input.state, pinCode: input.pinCode, isDefault: true } });
    return tx.order.create({ data: {
      orderNumber: reference, publicToken: randomBytes(32).toString('hex'), idempotencyKey, customerId: customer.id,
      customerName: input.fullName, customerPhone: input.phone, customerEmail: input.email || null,
      addressSnapshot: input.address, city: input.city, state: input.state, pinCode: input.pinCode,
      deliveryInstructions: input.instructions || null, subtotalPaise: calc.subtotalPaise,
      shippingPaise: calc.shippingPaise, discountPaise: calc.discountPaise, totalPaise: calc.totalPaise,
      orderStatus: 'ENQUIRY', paymentStatus: 'UNPAID',
      items: { create: calc.lines.map(({ product, quantity, lineTotalPaise }) => ({ productId: product.id, productName: product.name, sku: product.sku, mrpPaise: product.mrpPaise, sellingPricePaise: product.sellingPricePaise, quantity, lineTotalPaise })) },
      statusHistory: { create: { toStatus: 'ENQUIRY', note: 'Order enquiry created from storefront.' } },
    }, include: { items: true } });
  }, { maxWait: 10_000, timeout: 20_000 }));
  return ok(res, await orderResponse(order), 201);
}));

const TRANSIENT_DB_ERROR = /deadlock|lock wait timeout|connection pool timed out/i;
async function withTransactionRetry(work, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (error.code !== 'P2034' && !TRANSIENT_DB_ERROR.test(String(error.message))) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

publicRouter.get('/orders/reference/:orderNumber', asyncRoute(async (req, res) => {
  const order = await prisma.order.findUnique({ where: { orderNumber: req.params.orderNumber }, include: { items: true } });
  if (!order) return fail(res, 404, 'Order reference not found.');
  const summary = { orderNumber: order.orderNumber, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, totalPaise: order.totalPaise, createdAt: order.createdAt, items: order.items.map(({ productName, quantity, sellingPricePaise, lineTotalPaise }) => ({ productName, quantity, sellingPricePaise, lineTotalPaise })) };
  const token = String(req.query.token || '');
  if (token && token === order.publicToken) return ok(res, { ...summary, whatsappUrl: (await orderResponse(order)).whatsappUrl, publicToken: order.publicToken });
  return ok(res, summary);
}));

async function orderResponse(order) {
  const settings = await readSettings(['whatsappNumber']);
  const number = String(settings.whatsappNumber || process.env.WHATSAPP_BUSINESS_NUMBER || '').replace(/\D/g, '');
  const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const lineText = order.items.map((item) => `• ${item.productName} — ${item.quantity} pieces × ${rupees(item.sellingPricePaise)} = ${rupees(item.lineTotalPaise)}`).join('\n');
  const message = [
    'Hello Mann Ki Mannat!', '', 'I would like to place an order enquiry.', '', `Order Reference: ${order.orderNumber}`,
    lineText, '', `Subtotal: ${rupees(order.subtotalPaise)}`, `Shipping: ${order.shippingPaise === 0 ? 'FREE' : rupees(order.shippingPaise)}`,
    `Total: ${rupees(order.totalPaise)}`, '', `Customer Name: ${order.customerName}`, `Phone: ${order.customerPhone}`,
    `Address: ${order.addressSnapshot}, ${order.city}, ${order.state} ${order.pinCode}`, '', 'Please confirm my order.', '', 'Thank you!',
  ].join('\n');
  return { orderNumber: order.orderNumber, status: order.orderStatus, paymentStatus: order.paymentStatus, subtotalPaise: order.subtotalPaise, shippingPaise: order.shippingPaise, totalPaise: order.totalPaise, publicToken: order.publicToken, whatsappUrl: number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null };
}

publicRouter.post('/chatbot/query', asyncRoute(async (req, res) => {
  const input = validate(z.object({ message: z.string().trim().min(1).max(500) }), req.body);
  const message = input.message.toLowerCase();
  const settings = await readSettings(['chatbotEnabled', 'chatbotWelcome', 'freeShippingThreshold', 'shippingChargePaise', 'whatsappNumber']);
  if (settings.chatbotEnabled === false) return ok(res, { answer: 'The shopping assistant is taking a little pause. Please use the Contact page to reach us.' });
  if (/shipping|delivery|free ship/.test(message)) {
    const threshold = Number(settings.freeShippingThreshold ?? 6);
    const answer = settings.shippingChargePaise == null
      ? `Free shipping is configured for ${threshold} qualifying pieces. For the shipping charge on smaller orders, please contact our team.`
      : `Free shipping applies from ${threshold} qualifying pieces. The current shipping charge below that threshold is ₹${(Number(settings.shippingChargePaise) / 100).toFixed(2)}.`;
    return ok(res, { answer });
  }
  const faqs = await prisma.chatbotFaq.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, take: 50 });
  const faq = faqs.find((entry) => entry.question.toLowerCase().split(/\W+/).filter((word) => word.length > 3).some((word) => message.includes(word)));
  if (faq) return ok(res, { answer: faq.answer });
  const terms = message.split(/\W+/).filter((word) => word.length > 2).slice(0, 8);
  const products = terms.length ? await prisma.product.findMany({ where: { active: true, archivedAt: null, sellingPricePaise: { gt: 0 }, OR: terms.map((term) => ({ name: { contains: term } })) }, select: publicProductSelect, take: 4 }) : [];
  if (products.length) return ok(res, { answer: 'Here are a few pieces from the current catalogue. Prices and availability are shown from the store records.', products });
  const categories = await prisma.category.findMany({ where: { active: true }, select: { name: true } });
  const categoryNames = categories.map((category) => category.name).join(', ');
  const fallback = settings.chatbotWelcome || `I can help with product details, current catalogue prices, and shipping. Try asking about ${categoryNames || 'our collection'}, or reach our team through the Contact page.`;
  return ok(res, { answer: fallback });
}));
