import { readSettings } from './settings.js';
import { prisma } from '../config/db.js';
import { buildPricedLines, calculateTotals } from './pricing-core.js';

export async function calculateOrder(products, requestedItems) {
  const settings = await readSettings(['globalMinimumQuantity', 'freeShippingThreshold', 'shippingChargePaise', 'mixedCartShippingPolicy']);
  const globalMinimum = Number(settings.globalMinimumQuantity ?? 3);
  const lines = buildPricedLines(products, requestedItems, globalMinimum);
  const activeOffers = await prisma.offer.findMany({ where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }] }, orderBy: { createdAt: 'asc' } });
  return calculateTotals(lines, settings, activeOffers);
}
