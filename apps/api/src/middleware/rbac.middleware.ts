import type { RequestHandler } from 'express';
import { UserRole } from '@doc/shared';
import { AppError } from '../utils/AppError';

/**
 * Route-level RBAC guard.
 * Use after `authenticate` to restrict a route to specific roles.
 *
 * Example:
 *   router.delete('/leads/:id', authenticate, requireRole(UserRole.ADMIN), controller.delete)
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 401, 'Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'FORBIDDEN',
          403,
          `This action requires one of the following roles: ${roles.join(', ')}`,
        ),
      );
    }
    next();
  };
}

/** Convenience guard — restricts a route to Admin only. */
export const requireAdmin: RequestHandler = requireRole(UserRole.ADMIN);

/** Convenience guard — restricts a route to Admin or Counselor. */
export const requireCounselor: RequestHandler = requireRole(UserRole.ADMIN, UserRole.COUNSELOR);
