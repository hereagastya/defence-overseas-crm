import type { UserRole } from '@doc/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}
