import { AppError } from '../utils/AppError';
import { type AuthenticatedUser } from '../types/api.types';
import { type Action, RolePermissions } from './roles';

/** Returns true if the user's role grants the requested action. */
export function can(user: AuthenticatedUser, action: Action): boolean {
  return (RolePermissions[user.role] ?? []).includes(action);
}

/**
 * Throws FORBIDDEN if the user cannot perform the action.
 * Use inside service methods for fine-grained, post-auth checks.
 */
export function assertCan(
  user: AuthenticatedUser,
  action: Action,
  message = 'Insufficient permissions',
): void {
  if (!can(user, action)) {
    throw new AppError('FORBIDDEN', 403, message);
  }
}
