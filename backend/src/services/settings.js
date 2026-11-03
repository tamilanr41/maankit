import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

// Settings that must always exist for the storefront to work. The first value
// is the delivery charge (in paise) used for carts below the free-shipping
// threshold. It is only written when the setting is missing or empty, so an
// owner-edited value is never overwritten.
export const DEFAULT_SETTINGS = {
  shippingChargePaise: 6000,
};

export async function readSettings(keys) {
  const rows = await prisma.siteSetting.findMany({ where: keys ? { key: { in: keys } } : undefined });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function writeSetting(key, value, adminEmail) {
  const jsonValue = value === null ? Prisma.JsonNull : value;
  return prisma.siteSetting.upsert({ where: { key }, create: { key, value: jsonValue, updatedBy: adminEmail }, update: { value: jsonValue, updatedBy: adminEmail } });
}

export async function ensureDefaultSettings() {
  const created = [];
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await prisma.siteSetting.findUnique({ where: { key }, select: { id: true, value: true } });
    if (!existing) {
      await prisma.siteSetting.create({ data: { key, value, updatedBy: 'system' } });
      created.push(key);
    } else if (existing.value == null) {
      // A JSON null row means "not configured yet"; replace it with the default.
      await prisma.siteSetting.update({ where: { key }, data: { value, updatedBy: 'system' } });
      created.push(key);
    }
  }
  return created;
}

// An early admin save could clear `shippingEligible` on catalogue items. That
// flag silently blocks the advertised "free shipping on 12 pieces" offer, so a
// 12-piece bag was still charged delivery. Repair it once; after this marker
// exists the owner's own choices are respected.
const SHIPPING_FLAG_REPAIR = 'maintenance.shippingEligible.20261103';

export async function repairShippingEligibility() {
  const marker = await prisma.siteSetting.findUnique({ where: { key: SHIPPING_FLAG_REPAIR }, select: { key: true } });
  if (marker) return 0;
  const result = await prisma.product.updateMany({ where: { shippingEligible: false, archivedAt: null }, data: { shippingEligible: true } });
  await prisma.siteSetting.create({ data: { key: SHIPPING_FLAG_REPAIR, value: { repaired: result.count, at: new Date().toISOString() }, updatedBy: 'system' } });
  return result.count;
}
