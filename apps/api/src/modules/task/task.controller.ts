import type { RequestHandler } from 'express';
import { taskFiltersSchema, createTaskSchema, updateTaskSchema } from '@doc/shared';
import * as taskService from './task.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/apiResponse';

export const listTasks: RequestHandler = async (req, res, next) => {
  try {
    const filters = taskFiltersSchema.parse(req.query);
    const { tasks, pagination } = await taskService.listTasks(filters, req.user!);
    sendPaginated(res, tasks, pagination);
  } catch (err) {
    next(err);
  }
};

export const getTask: RequestHandler = async (req, res, next) => {
  try {
    const task = await taskService.getTask(req.params.id, req.user!);
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
};

export const createTask: RequestHandler = async (req, res, next) => {
  try {
    const input = createTaskSchema.parse(req.body);
    const task = await taskService.createTask(input, req.user!);
    sendCreated(res, task);
  } catch (err) {
    next(err);
  }
};

export const updateTask: RequestHandler = async (req, res, next) => {
  try {
    const input = updateTaskSchema.parse(req.body);
    const task = await taskService.updateTask(req.params.id, input, req.user!);
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
};

export const deleteTask: RequestHandler = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id, req.user!);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const reopenTask: RequestHandler = async (req, res, next) => {
  try {
    const task = await taskService.reopenTask(req.params.id, req.user!);
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
};

export const completeTask: RequestHandler = async (req, res, next) => {
  try {
    const task = await taskService.completeTask(req.params.id, req.user!);
    sendSuccess(res, task);
  } catch (err) {
    next(err);
  }
};
