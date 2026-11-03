import { readSettings } from './settings.js';
import { prisma } from '../config/db.js';
import { buildPricedLines, calculateTotals } from './pricing-core.js';

export async function calculateOrder(products, requestedItems) {
  // Settings and offers are independent reads; running them together saves a
  // full database round trip on every price check and order submission.
  const [settings, activeOffers] = await Promise.all([
    readSettings(['globalMinimumQuantity', 'freeShippingThreshold', 'shippingChargePaise', 'mixedCartShippingPolicy']),
    prisma.offer.findMany({ where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }] }, orderBy: { createdAt: 'asc' } }),
  ]);
  const globalMinimum = Number(settings.globalMinimumQuantity ?? 3);
  const lines = buildPricedLines(products, requestedItems, globalMinimum);
  return calculateTotals(lines, settings, activeOffers);
}
