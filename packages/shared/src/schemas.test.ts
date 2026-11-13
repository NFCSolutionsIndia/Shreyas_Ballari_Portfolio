import { describe, expect, it } from 'vitest';
import { contactSchema } from './schemas';

const valid = {
  name: 'Ms. Rivera',
  email: 'rivera@example.edu',
  role: 'teacher',
  message: 'I would love to hear more about the Oncure project.',
  turnstileToken: 'token',
};

describe('contactSchema', () => {
  it('accepts a valid message', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a filled honeypot', () => {
    expect(contactSchema.safeParse({ ...valid, website: 'spam.biz' }).success).toBe(false);
  });

  it('rejects a short message and an unknown role', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'hi' }).success).toBe(false);
    expect(contactSchema.safeParse({ ...valid, role: 'recruiter' }).success).toBe(false);
  });

  it('trims whitespace before length checks', () => {
    expect(contactSchema.safeParse({ ...valid, name: '  A  ' }).success).toBe(false);
  });
});
