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
