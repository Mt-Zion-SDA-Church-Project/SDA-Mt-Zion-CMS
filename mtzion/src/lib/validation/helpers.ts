import { z } from 'zod';

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(' ');
}
