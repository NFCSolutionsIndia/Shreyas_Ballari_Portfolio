import { z } from 'zod';

const schema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:4000/api/v1'),
  VITE_SITE_URL: z.string().url().default('http://localhost:5173'),
  VITE_TURNSTILE_SITE_KEY: z.string().optional(),
  VITE_SENTRY_DSN: z.string().optional(),
  VITE_ANALYTICS_DOMAIN: z.string().optional(),
  /** Where the contact form posts (for example a Formspree form URL). Empty: not connected yet. */
  VITE_CONTACT_ENDPOINT: z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional()),
});

export const env = schema.parse(import.meta.env);
