import type { RequestHandler } from 'express';
import {
  followupFiltersSchema,
  createFollowupSchema,
  updateFollowupSchema,
  completeFollowupSchema,
} from '@doc/shared';
import * as followupService from './followup.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';

export const listFollowups: RequestHandler = async (req, res, next) => {
  try {
    const filters = followupFiltersSchema.parse(req.query);
    const { followups, pagination } = await followupService.listFollowups(filters, req.user!);
    sendPaginated(res, followups, pagination);
  } catch (err) {
    next(err);
  }
};

export const getFollowup: RequestHandler = async (req, res, next) => {
  try {
    const followup = await followupService.getFollowup(req.params.id, req.user!);
    sendSuccess(res, followup);
  } catch (err) {
    next(err);
  }
};

export const createFollowup: RequestHandler = async (req, res, next) => {
  try {
    const input = createFollowupSchema.parse(req.body);
    const followup = await followupService.createFollowup(input, req.user!);
    sendCreated(res, followup);
  } catch (err) {
    next(err);
  }
};

export const updateFollowup: RequestHandler = async (req, res, next) => {
  try {
    const input = updateFollowupSchema.parse(req.body);
    const followup = await followupService.updateFollowup(req.params.id, input, req.user!);
    sendSuccess(res, followup);
  } catch (err) {
    next(err);
  }
};

export const deleteFollowup: RequestHandler = async (req, res, next) => {
  try {
    await followupService.deleteFollowup(req.params.id, req.user!);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const completeFollowup: RequestHandler = async (req, res, next) => {
  try {
    const input = completeFollowupSchema.parse(req.body);
    const followup = await followupService.completeFollowup(req.params.id, input, req.user!);
    sendSuccess(res, followup);
  } catch (err) {
    next(err);
  }
};
