import type { RequestHandler } from 'express';
import multer from 'multer';
import { AppError } from '../utils/AppError';
import { UPLOAD_MAX_FILE_SIZE_BYTES, ALLOWED_DOCUMENT_MIME_TYPES } from '../config/constants';

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if ((ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'INVALID_FILE_TYPE',
        400,
        `File type '${file.mimetype}' is not allowed. Permitted: PDF, JPEG, PNG, Word, Excel`,
      ),
    );
  }
};

const multerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_FILE_SIZE_BYTES },
  fileFilter,
}).single('file');

/**
 * Wraps multer.single('file') and normalises MulterError into AppError so the
 * central error handler can format a consistent JSON response.
 *
 * Expects the field name 'file' in multipart/form-data.
 */
export const uploadDocumentMiddleware: RequestHandler = (req, res, next) => {
  multerUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(
          new AppError(
            'FILE_TOO_LARGE',
            400,
            `File exceeds the maximum allowed size of ${UPLOAD_MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
          ),
        );
      }
      return next(new AppError('UPLOAD_ERROR', 400, err.message));
    }
    next(err);
  });
};
