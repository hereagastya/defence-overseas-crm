import type { RequestHandler } from 'express';
import { assignFeeSchema, updateFeeSchema } from '@doc/shared';
import * as feeService from './fee.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';

export const listFees: RequestHandler = async (req, res, next) => {
  try {
    const fees = await feeService.listFees(req.params.studentId, req.user!);
    sendSuccess(res, fees);
  } catch (err) {
    next(err);
  }
};

export const getFee: RequestHandler = async (req, res, next) => {
  try {
    const fee = await feeService.getFee(req.params.studentId, req.params.feeId, req.user!);
    sendSuccess(res, fee);
  } catch (err) {
    next(err);
  }
};

export const assignFee: RequestHandler = async (req, res, next) => {
  try {
    const input = assignFeeSchema.parse(req.body);
    const fee = await feeService.assignFee(req.params.studentId, input, req.user!);
    sendCreated(res, fee);
  } catch (err) {
    next(err);
  }
};

export const updateFee: RequestHandler = async (req, res, next) => {
  try {
    const input = updateFeeSchema.parse(req.body);
    const fee = await feeService.updateFee(
      req.params.studentId,
      req.params.feeId,
      input,
      req.user!,
    );
    sendSuccess(res, fee);
  } catch (err) {
    next(err);
  }
};

export const deleteFee: RequestHandler = async (req, res, next) => {
  try {
    await feeService.deleteFee(req.params.studentId, req.params.feeId, req.user!);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
