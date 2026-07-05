import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import { UserRole } from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import * as reportRepo from './report.repository';
import type {
  ReportDateFilters,
  LeadsReport,
  RevenueReport,
  CounselorPerformanceReport,
  StudentProgressReport,
  ApplicationsReport,
  CountryDistributionReport,
  TasksReport,
  FollowUpsReport,
} from './report.repository';

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.ADMIN;
}

export async function getLeadsReport(
  filters: ReportDateFilters,
  user: AuthenticatedUser,
): Promise<LeadsReport> {
  assertCan(user, Actions.REPORTS_OWN);
  return reportRepo.getLeadsReport(filters, user.id, isAdmin(user));
}

export async function getRevenueReport(
  filters: ReportDateFilters,
  user: AuthenticatedUser,
): Promise<RevenueReport> {
  assertCan(user, Actions.REPORTS_OWN);
  return reportRepo.getRevenueReport(filters, user.id, isAdmin(user));
}

export async function getCounselorPerformance(
  _filters: ReportDateFilters,
  user: AuthenticatedUser,
): Promise<CounselorPerformanceReport> {
  assertCan(user, Actions.REPORTS_ALL);

  const report = await reportRepo.getCounselorPerformance();

  // Non-admin: filtered to own entry only (defensive, since REPORTS_ALL admin-only)
  if (!isAdmin(user)) {
    return {
      counselors: report.counselors.filter((c) => c.counselor_id === user.id),
    };
  }

  return report;
}

export async function getStudentProgressReport(
  filters: ReportDateFilters,
  user: AuthenticatedUser,
): Promise<StudentProgressReport> {
  assertCan(user, Actions.REPORTS_OWN);
  return reportRepo.getStudentProgressReport(filters, user.id, isAdmin(user));
}

export async function getApplicationsReport(
  filters: ReportDateFilters,
  user: AuthenticatedUser,
): Promise<ApplicationsReport> {
  assertCan(user, Actions.REPORTS_OWN);
  return reportRepo.getApplicationsReport(filters);
}

export async function getCountryDistributionReport(
  user: AuthenticatedUser,
): Promise<CountryDistributionReport> {
  assertCan(user, Actions.REPORTS_OWN);
  return reportRepo.getCountryDistributionReport(user.id, isAdmin(user));
}

export async function getTasksReport(
  filters: ReportDateFilters,
  user: AuthenticatedUser,
): Promise<TasksReport> {
  assertCan(user, Actions.REPORTS_OWN);
  return reportRepo.getTasksReport(filters, user.id, isAdmin(user));
}

export async function getFollowUpsReport(
  filters: ReportDateFilters,
  user: AuthenticatedUser,
): Promise<FollowUpsReport> {
  assertCan(user, Actions.REPORTS_OWN);
  return reportRepo.getFollowUpsReport(filters, user.id, isAdmin(user));
}
