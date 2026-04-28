import { z } from 'zod';

const normalizePhone = (value: string) => value.replace(/[\s()-]/g, '');
const localPhonePattern = /^0\d{9}$/;
const intlPhonePattern = /^\+[1-9]\d{0,3}\d{9}$/;
const phoneRuleMessage =
  'Use either 10 local digits (e.g. 07XXXXXXXX) or country code + 9 digits (e.g. +2567XXXXXXXX).';

function isValidPhoneEntry(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const normalized = normalizePhone(trimmed);
  return localPhonePattern.test(normalized) || intlPhonePattern.test(normalized);
}

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const addMemberFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    middleName: z.string(),
    lastName: z.string().trim().min(1, 'Last name is required'),
    gender: z.enum(['male', 'female'], { message: 'Please select gender' }),
    dateOfBirth: z.string(),
    residence: z.string(),
    placeOfBirth: z.string(),
    ministries: z.array(z.string()),
    phone: z.string(),
    email: z.union([z.literal(''), z.string().trim().email('Invalid email address')]),
    familyId: z.string(),
    userId: z.string(),
  })
  .superRefine((data, ctx) => {
    const dob = data.dateOfBirth.trim();
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date of birth must be YYYY-MM-DD',
        path: ['dateOfBirth'],
      });
    }
    if (!isValidPhoneEntry(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: phoneRuleMessage,
        path: ['phone'],
      });
    }
  });

export const visitorFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    phone: z.string().trim().min(1, 'Phone is required'),
    email: z.string().trim().email('Enter a valid email'),
    address: z.string().trim().min(3, 'Address is required'),
    dateOfBirth: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  })
  .superRefine((data, ctx) => {
    if (!isValidPhoneEntry(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: phoneRuleMessage,
        path: ['phone'],
      });
    }
  });

export const addSystemUserFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, 'Username must be at least 2 characters')
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username may only contain letters, numbers, dots, underscores, and hyphens'),
  fullName: z.string().trim().min(2, 'Full name is required'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'member', 'super_admin']),
});

export const sabbathResourceUploadSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  category: z.enum(['adult', 'children']),
});

export const MAX_SABBATH_RESOURCE_BYTES = 25 * 1024 * 1024;

export const addTeenFormSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    surname: z.string(),
    lastName: z.string().trim().min(1, 'Last name is required'),
    gender: z.enum(['male', 'female'], { message: 'Please select gender' }),
    birthday: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthday must be YYYY-MM-DD'),
    residence: z.string(),
    placeOfBirth: z.string(),
    parentsName: z.string(),
    mobile: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!isValidPhoneEntry(data.mobile)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: phoneRuleMessage,
        path: ['mobile'],
      });
    }
  });

export const eventSaveFormSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    description: z.string(),
    eventDate: z.string().trim().min(1, 'Event date is required'),
    endDate: z.string(),
    location: z.string().max(500),
    eventType: z.string().max(50),
    registrationRequired: z.boolean(),
    isNewEvent: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.eventDate);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid event start date',
        path: ['eventDate'],
      });
      return;
    }
    if (data.isNewEvent && start.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'New events must be scheduled in the future',
        path: ['eventDate'],
      });
    }
    if (data.endDate.trim()) {
      const end = new Date(data.endDate);
      if (Number.isNaN(end.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid end date',
          path: ['endDate'],
        });
      } else if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End must be on or after the start',
          path: ['endDate'],
        });
      }
    }
  });

export const memberPortalUserPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128);

/** Create-user modal on member row (links Auth + system_users). */
export const createPortalUserFromMemberSchema = z.object({
  password: memberPortalUserPasswordSchema,
  role: z.enum(['admin', 'member', 'super_admin']),
});

export const offertoryNotesSchema = z.string().max(2000, 'Notes are too long');
