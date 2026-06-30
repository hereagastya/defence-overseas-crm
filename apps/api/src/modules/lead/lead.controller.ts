import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  leadFiltersSchema,
  createLeadSchema,
  updateLeadSchema,
  updateLeadStageSchema,
  assignLeadSchema,
  convertLeadSchema,
} from '@doc/shared';
import * as leadService from './lead.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';

export const listLeads: RequestHandler = async (req, res, next) => {
  try {
    const filters = leadFiltersSchema.parse(req.query);
    const { leads, pagination } = await leadService.listLeads(filters, req.user!);
    sendPaginated(res, leads, pagination);
  } catch (err) {
    next(err);
  }
};

export const getLead: RequestHandler = async (req, res, next) => {
  try {
    const lead = await leadService.getLead(req.params.id, req.user!);
    sendSuccess(res, lead);
  } catch (err) {
    next(err);
  }
};

export const createLead: RequestHandler = async (req, res, next) => {
  try {
    const input = createLeadSchema.parse(req.body);
    const lead = await leadService.createLead(input, req.user!);
    sendCreated(res, lead);
  } catch (err) {
    next(err);
  }
};

export const updateLead: RequestHandler = async (req, res, next) => {
  try {
    const input = updateLeadSchema.parse(req.body);
    const lead = await leadService.updateLead(req.params.id, input, req.user!);
    sendSuccess(res, lead);
  } catch (err) {
    next(err);
  }
};

export const deleteLead: RequestHandler = async (req, res, next) => {
  try {
    await leadService.deleteLead(req.params.id, req.user!);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const updateLeadStage: RequestHandler = async (req, res, next) => {
  try {
    const input = updateLeadStageSchema.parse(req.body);
    const lead = await leadService.updateLeadStage(req.params.id, input, req.user!);
    sendSuccess(res, lead);
  } catch (err) {
    next(err);
  }
};

export const assignLead: RequestHandler = async (req, res, next) => {
  try {
    const { counselor_id } = assignLeadSchema.parse(req.body);
    const lead = await leadService.assignLead(req.params.id, counselor_id, req.user!);
    sendSuccess(res, lead);
  } catch (err) {
    next(err);
  }
};

export const convertLead: RequestHandler = async (req, res, next) => {
  try {
    const input = convertLeadSchema.parse(req.body);
    const result = await leadService.convertLead(req.params.id, input, req.user!);
    sendCreated(res, result);
  } catch (err) {
    next(err);
  }
};

export const getLeadNotes: RequestHandler = async (req, res, next) => {
  try {
    const notes = await leadService.getLeadNotes(req.params.id, req.user!);
    sendSuccess(res, notes);
  } catch (err) {
    next(err);
  }
};

export const addLeadNote: RequestHandler = async (req, res, next) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(5000) }).parse(req.body);
    const note = await leadService.addLeadNote(req.params.id, content, req.user!);
    sendCreated(res, note);
  } catch (err) {
    next(err);
  }
};

export const getLeadActivity: RequestHandler = async (req, res, next) => {
  try {
    const activity = await leadService.getLeadActivity(req.params.id, req.user!);
    sendSuccess(res, activity);
  } catch (err) {
    next(err);
  }
};
