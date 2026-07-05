import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as reportService from './report.service';
import { sendSuccess } from '../../utils/apiResponse';

const reportFiltersSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  counselor_id: z.string().uuid().optional(),
});

export const getLeadsReport: RequestHandler = async (req, res, next) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const report = await reportService.getLeadsReport(filters, req.user!);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

export const getRevenueReport: RequestHandler = async (req, res, next) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const report = await reportService.getRevenueReport(filters, req.user!);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

export const getCounselorPerformance: RequestHandler = async (req, res, next) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const report = await reportService.getCounselorPerformance(filters, req.user!);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

export const getStudentProgress: RequestHandler = async (req, res, next) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const report = await reportService.getStudentProgressReport(filters, req.user!);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

export const getApplicationsReport: RequestHandler = async (req, res, next) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const report = await reportService.getApplicationsReport(filters, req.user!);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

export const getCountryDistribution: RequestHandler = async (req, res, next) => {
  try {
    const report = await reportService.getCountryDistributionReport(req.user!);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

export const getTasksReport: RequestHandler = async (req, res, next) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const report = await reportService.getTasksReport(filters, req.user!);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

export const getFollowUpsReport: RequestHandler = async (req, res, next) => {
  try {
    const filters = reportFiltersSchema.parse(req.query);
    const report = await reportService.getFollowUpsReport(filters, req.user!);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};
