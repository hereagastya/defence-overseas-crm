import type { RequestHandler } from 'express';
import { z } from 'zod';
import {
  studentFiltersSchema,
  updateStudentSchema,
  updateStudentStageSchema,
  assignStudentSchema,
} from '@doc/shared';
import * as studentService from './student.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/apiResponse';

export const listStudents: RequestHandler = async (req, res, next) => {
  try {
    const filters = studentFiltersSchema.parse(req.query);
    const { students, pagination } = await studentService.listStudents(filters, req.user!);
    sendPaginated(res, students, pagination);
  } catch (err) {
    next(err);
  }
};

export const getStudent: RequestHandler = async (req, res, next) => {
  try {
    const student = await studentService.getStudent(req.params.id, req.user!);
    sendSuccess(res, student);
  } catch (err) {
    next(err);
  }
};

export const updateStudent: RequestHandler = async (req, res, next) => {
  try {
    const input = updateStudentSchema.parse(req.body);
    const student = await studentService.updateStudent(req.params.id, input, req.user!);
    sendSuccess(res, student);
  } catch (err) {
    next(err);
  }
};

export const updateStudentStage: RequestHandler = async (req, res, next) => {
  try {
    const input = updateStudentStageSchema.parse(req.body);
    const student = await studentService.updateStudentStage(req.params.id, input, req.user!);
    sendSuccess(res, student);
  } catch (err) {
    next(err);
  }
};

export const assignStudent: RequestHandler = async (req, res, next) => {
  try {
    const { counselor_id } = assignStudentSchema.parse(req.body);
    const student = await studentService.assignStudent(req.params.id, counselor_id, req.user!);
    sendSuccess(res, student);
  } catch (err) {
    next(err);
  }
};

export const getStudentNotes: RequestHandler = async (req, res, next) => {
  try {
    const notes = await studentService.getStudentNotes(req.params.id, req.user!);
    sendSuccess(res, notes);
  } catch (err) {
    next(err);
  }
};

export const addStudentNote: RequestHandler = async (req, res, next) => {
  try {
    const { content } = z.object({ content: z.string().min(1).max(5000) }).parse(req.body);
    const note = await studentService.addStudentNote(req.params.id, content, req.user!);
    sendCreated(res, note);
  } catch (err) {
    next(err);
  }
};

export const getStudentActivity: RequestHandler = async (req, res, next) => {
  try {
    const activity = await studentService.getStudentActivity(req.params.id, req.user!);
    sendSuccess(res, activity);
  } catch (err) {
    next(err);
  }
};

export const getStudentTimeline: RequestHandler = async (req, res, next) => {
  try {
    const timeline = await studentService.getStudentTimeline(req.params.id, req.user!);
    sendSuccess(res, timeline);
  } catch (err) {
    next(err);
  }
};
