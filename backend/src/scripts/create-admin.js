import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Store owner';
  if (!email || !password || password.length < 16) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD. The password must be at least 16 characters.');
  const existingOwner = await prisma.adminUser.findFirst({ where: { role: { name: 'OWNER' }, active: true } });
  if (existingOwner) throw new Error('An active owner account already exists. Create additional administrators from the Team Access screen.');
  const role = await prisma.role.upsert({ where: { name: 'OWNER' }, create: { name: 'OWNER', description: 'Full access to store management.' }, update: {} });
  const admin = await prisma.adminUser.create({ data: { name, email, passwordHash: await bcrypt.hash(password, Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 10), roleId: role.id } });
  console.log(`Created the initial owner account for ${admin.email}. Remove ADMIN_PASSWORD from your shell environment now.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
