import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Supabase — service role key is server-only; NEVER expose to the frontend
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(1, 'SUPABASE_JWT_SECRET is required'),

  // CORS
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required'),

  // Meta Lead Ads webhook
  META_WEBHOOK_SECRET: z.string().min(1, 'META_WEBHOOK_SECRET is required'),
  META_VERIFY_TOKEN: z.string().min(1, 'META_VERIFY_TOKEN is required'),

  // Website contact-form webhook
  WEBSITE_WEBHOOK_SECRET: z.string().min(1, 'WEBSITE_WEBHOOK_SECRET is required'),

  // Session
  SESSION_TIMEOUT_HOURS: z.coerce.number().int().positive().default(8),

  // Rate limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // Use console.error here — logger may not be initialised yet
    console.error(`[api] Environment validation failed:\n${errors}`);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
