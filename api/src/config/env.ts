import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL:     z.string().min(1, 'DATABASE_URL é obrigatório'),
  JWT_SECRET:       z.string().min(16, 'JWT_SECRET deve ter no mínimo 16 caracteres'),
  REDIS_HOST:       z.string().default('localhost'),
  REDIS_PORT:       z.coerce.number().int().positive().default(6379),
  NODE_ENV:         z.enum(['development', 'production', 'test']).default('development'),
  PORT:             z.coerce.number().int().positive().default(3001),
  JWT_EXPIRES_IN:   z.string().default('7d'),
  UPLOAD_DIR:       z.string().default('uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;
