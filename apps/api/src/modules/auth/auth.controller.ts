import type { RequestHandler } from 'express';
import { loginSchema, changePasswordSchema } from '@doc/shared';
import * as authService from './auth.service';
import { sendSuccess, sendNoContent } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

function extractToken(req: Parameters<RequestHandler>[0]): string {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication token is required');
  }
  return header.slice(7);
}

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const logout: RequestHandler = async (req, res, next) => {
  try {
    const token = extractToken(req);
    await authService.logout(token);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const getSession: RequestHandler = async (req, res, next) => {
  try {
    const profile = await authService.getSessionProfile(req.user!.id);
    sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
};

export const changePassword: RequestHandler = async (req, res, next) => {
  try {
    const input = changePasswordSchema.parse(req.body);
    const token = extractToken(req);
    await authService.changePassword(req.user!.id, req.user!.email, token, input);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
