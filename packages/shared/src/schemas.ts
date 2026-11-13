import { z } from 'zod';
import { CONTACT_LIMITS as L, CONTACT_ROLES } from './constants';

// The same rules run in the contact form and in POST /contact.
export const contactSchema = z.object({
  name: z.string().trim().min(L.nameMin).max(L.nameMax),
  email: z.string().trim().email().max(L.emailMax),
  role: z.enum(CONTACT_ROLES),
  message: z.string().trim().min(L.messageMin).max(L.messageMax),
  turnstileToken: z.string().min(1),
  website: z.string().max(0).optional(), // honeypot: must stay empty
});

export type ContactMessage = z.infer<typeof contactSchema>;
