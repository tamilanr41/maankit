import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const newEmail = process.env.ADMIN_NEW_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email) throw new Error('Set ADMIN_EMAIL to the current login email.');
  if (!password || password.length < 16) throw new Error('Set ADMIN_PASSWORD with at least 16 characters.');

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) throw new Error(`No admin user found for ${email}.`);

  const updated = await prisma.adminUser.update({
    where: { email },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      active: true,
      ...(name ? { name } : {}),
      ...(newEmail ? { email: newEmail } : {}),
    },
  });

  console.log(`Updated ${updated.email} (${updated.name}). Remove ADMIN_PASSWORD from your shell environment now.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
