import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters.'),
  ADMIN_SETUP_TOKEN: z.string().min(32, 'ADMIN_SETUP_TOKEN must be at least 32 characters.').optional(),
  ADMIN_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).optional(),
  WHATSAPP_BUSINESS_NUMBER: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  LOG_LEVEL: z.string().default('info'),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
  throw new Error(`Invalid backend environment configuration:\n${issues}`);
}
export const env = result.data;
