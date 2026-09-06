import type { AuthenticatedUser } from './api.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
      /** Raw request body buffer — populated by express.json verify callback for HMAC verification */
      rawBody?: Buffer;
    }
  }
}

export {};
