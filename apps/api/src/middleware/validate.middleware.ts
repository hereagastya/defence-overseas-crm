import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Validates a section of the Express request against a Zod schema.
 * Assigns the parsed (and coerced/transformed) data back to the request object.
 * Throws VALIDATION_ERROR with per-field details on failure.
 *
 * Usage:
 *   router.post('/leads', validate(createLeadSchema), controller.create)
 *   router.get('/leads',  validate(leadFiltersSchema, 'query'), controller.list)
 */
export function validate(schema: ZodTypeAny, target: ValidateTarget = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.issues.reduce<Record<string, string[]>>((acc, issue) => {
        const key = issue.path.length > 0 ? issue.path.join('.') : 'root';
        acc[key] = [...(acc[key] ?? []), issue.message];
        return acc;
      }, {});

      return next(new AppError('VALIDATION_ERROR', 400, 'Validation failed', details));
    }

    // Replace the raw input with the schema-parsed (coerced/defaulted) value
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
