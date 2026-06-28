import { z } from 'zod';
import { UserRole } from '../enums';

export const createEmployeeSchema = z.object({
  email: z.string().email('Enter a valid company email address'),
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(255),
  role: z.nativeEnum(UserRole),
  phone: z.string().min(10, 'Enter a valid phone number').max(20),
  designation: z.string().max(100).optional(),
  temp_password: z
    .string()
    .min(8, 'Temporary password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

export const updateEmployeeSchema = z.object({
  full_name: z.string().min(2).max(255).optional(),
  phone: z.string().min(10).max(20).optional(),
  designation: z.string().max(100).optional(),
  role: z.nativeEnum(UserRole).optional(),
  is_active: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  new_password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
