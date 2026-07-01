import type { RequestHandler } from 'express';
import { uploadDocumentSchema } from '@doc/shared';
import * as documentService from './document.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export const listDocuments: RequestHandler = async (req, res, next) => {
  try {
    const allVersions = req.query.all_versions === 'true';
    const documents = await documentService.listDocuments(
      req.params.studentId,
      req.user!,
      allVersions,
    );
    sendSuccess(res, documents);
  } catch (err) {
    next(err);
  }
};

export const uploadDocument: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError(
        'NO_FILE',
        400,
        "No file provided. Include a 'file' field in multipart/form-data",
      );
    }

    const input = uploadDocumentSchema.parse(req.body);
    const document = await documentService.uploadDocument(
      req.params.studentId,
      input,
      req.file,
      req.user!,
    );
    sendCreated(res, document);
  } catch (err) {
    next(err);
  }
};

export const downloadDocument: RequestHandler = async (req, res, next) => {
  try {
    const result = await documentService.downloadDocument(
      req.params.studentId,
      req.params.id,
      req.user!,
    );
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const deleteDocument: RequestHandler = async (req, res, next) => {
  try {
    await documentService.deleteDocument(req.params.studentId, req.params.id, req.user!);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
};
