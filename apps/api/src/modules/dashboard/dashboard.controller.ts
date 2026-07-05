import type { RequestHandler } from 'express';
import * as dashboardService from './dashboard.service';
import { sendSuccess } from '../../utils/apiResponse';

export const getSummary: RequestHandler = async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary(req.user!);
    sendSuccess(res, summary);
  } catch (err) {
    next(err);
  }
};

export const getKPIs: RequestHandler = async (req, res, next) => {
  try {
    const kpis = await dashboardService.getKPIs(req.user!);
    sendSuccess(res, kpis);
  } catch (err) {
    next(err);
  }
};

export const getCharts: RequestHandler = async (req, res, next) => {
  try {
    const charts = await dashboardService.getCharts(req.user!);
    sendSuccess(res, charts);
  } catch (err) {
    next(err);
  }
};

export const getUpcomingFollowups: RequestHandler = async (req, res, next) => {
  try {
    const followups = await dashboardService.getUpcomingFollowups(req.user!);
    sendSuccess(res, followups);
  } catch (err) {
    next(err);
  }
};

export const getRecentActivity: RequestHandler = async (req, res, next) => {
  try {
    const activity = await dashboardService.getRecentActivity(req.user!);
    sendSuccess(res, activity);
  } catch (err) {
    next(err);
  }
};
