import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

export async function readSettings(keys) {
  const rows = await prisma.siteSetting.findMany({ where: keys ? { key: { in: keys } } : undefined });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}
export async function writeSetting(key, value, adminEmail) {
  const jsonValue = value === null ? Prisma.JsonNull : value;
  return prisma.siteSetting.upsert({ where: { key }, create: { key, value: jsonValue, updatedBy: adminEmail }, update: { value: jsonValue, updatedBy: adminEmail } });
}
