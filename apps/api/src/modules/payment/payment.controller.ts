import type { RequestHandler } from 'express';
import { recordInstallmentSchema, updateInstallmentSchema, duesFiltersSchema } from '@doc/shared';
import * as paymentService from './payment.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';

export const listPayments: RequestHandler = async (req, res, next) => {
  try {
    const payments = await paymentService.listPayments(
      req.params.studentId,
      req.params.feeId,
      req.user!,
    );
    sendSuccess(res, payments);
  } catch (err) {
    next(err);
  }
};

export const recordPayment: RequestHandler = async (req, res, next) => {
  try {
    const input = recordInstallmentSchema.parse(req.body);
    const payment = await paymentService.recordPayment(
      req.params.studentId,
      req.params.feeId,
      input,
      req.user!,
    );
    sendCreated(res, payment);
  } catch (err) {
    next(err);
  }
};

export const updatePayment: RequestHandler = async (req, res, next) => {
  try {
    const input = updateInstallmentSchema.parse(req.body);
    const payment = await paymentService.updatePayment(
      req.params.studentId,
      req.params.feeId,
      req.params.paymentId,
      input,
      req.user!,
    );
    sendSuccess(res, payment);
  } catch (err) {
    next(err);
  }
};

export const deletePayment: RequestHandler = async (req, res, next) => {
  try {
    await paymentService.deletePayment(
      req.params.studentId,
      req.params.feeId,
      req.params.paymentId,
      req.user!,
    );
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

export const getReceipt: RequestHandler = async (req, res, next) => {
  try {
    const result = await paymentService.getReceipt(
      req.params.studentId,
      req.params.feeId,
      req.params.paymentId,
      req.user!,
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getDues: RequestHandler = async (req, res, next) => {
  try {
    const filters = duesFiltersSchema.parse(req.query);
    const dues = await paymentService.getDues(filters, req.user!);
    sendSuccess(res, dues);
  } catch (err) {
    next(err);
  }
};
