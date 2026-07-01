import type { RequestHandler } from 'express';
import { createApplicationSchema, updateApplicationSchema } from '@doc/shared';
import * as applicationService from './application.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';

export const listApplications: RequestHandler = async (req, res, next) => {
  try {
    const applications = await applicationService.listApplications(req.params.studentId, req.user!);
    sendSuccess(res, applications);
  } catch (err) {
    next(err);
  }
};

export const getApplication: RequestHandler = async (req, res, next) => {
  try {
    const application = await applicationService.getApplication(
      req.params.studentId,
      req.params.id,
      req.user!,
    );
    sendSuccess(res, application);
  } catch (err) {
    next(err);
  }
};

export const createApplication: RequestHandler = async (req, res, next) => {
  try {
    const input = createApplicationSchema.parse(req.body);
    const application = await applicationService.createApplication(
      req.params.studentId,
      input,
      req.user!,
    );
    sendCreated(res, application);
  } catch (err) {
    next(err);
  }
};

export const updateApplication: RequestHandler = async (req, res, next) => {
  try {
    const input = updateApplicationSchema.parse(req.body);
    const application = await applicationService.updateApplication(
      req.params.studentId,
      req.params.id,
      input,
      req.user!,
    );
    sendSuccess(res, application);
  } catch (err) {
    next(err);
  }
};

export const deleteApplication: RequestHandler = async (req, res, next) => {
  try {
    await applicationService.deleteApplication(req.params.studentId, req.params.id, req.user!);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
