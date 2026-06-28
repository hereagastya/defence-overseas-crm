import type { RequestHandler } from 'express';
import { createEmployeeSchema, updateEmployeeSchema, resetPasswordSchema } from '@doc/shared';
import * as employeeService from './employee.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';

export const listEmployees: RequestHandler = async (_req, res, next) => {
  try {
    const employees = await employeeService.listEmployees();
    sendSuccess(res, employees);
  } catch (err) {
    next(err);
  }
};

export const getEmployee: RequestHandler = async (req, res, next) => {
  try {
    const employee = await employeeService.getEmployee(req.params.id);
    sendSuccess(res, employee);
  } catch (err) {
    next(err);
  }
};

export const createEmployee: RequestHandler = async (req, res, next) => {
  try {
    const input = createEmployeeSchema.parse(req.body);
    const employee = await employeeService.createEmployee(input, req.user!.id);
    sendCreated(res, employee);
  } catch (err) {
    next(err);
  }
};

export const updateEmployee: RequestHandler = async (req, res, next) => {
  try {
    const input = updateEmployeeSchema.parse(req.body);
    const employee = await employeeService.updateEmployee(req.params.id, input, req.user!.id);
    sendSuccess(res, employee);
  } catch (err) {
    next(err);
  }
};

export const deactivateEmployee: RequestHandler = async (req, res, next) => {
  try {
    await employeeService.deactivateEmployee(req.params.id, req.user!.id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await employeeService.resetPassword(req.params.id, input, req.user!.id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
