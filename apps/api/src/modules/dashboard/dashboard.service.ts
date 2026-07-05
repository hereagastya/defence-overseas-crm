import { assertCan } from '../../permissions/policies';
import { Actions } from '../../permissions/roles';
import { UserRole } from '@doc/shared';
import type { AuthenticatedUser } from '../../types/api.types';
import * as dashboardRepo from './dashboard.repository';
import type {
  DashboardSummary,
  DashboardKPIs,
  DashboardCharts,
  UpcomingFollowup,
  RecentActivityEntry,
} from './dashboard.repository';

function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === UserRole.ADMIN;
}

export async function getSummary(user: AuthenticatedUser): Promise<DashboardSummary> {
  assertCan(user, Actions.DASHBOARD_READ);
  return dashboardRepo.getSummary(user.id, isAdmin(user));
}

export async function getKPIs(user: AuthenticatedUser): Promise<DashboardKPIs> {
  assertCan(user, Actions.DASHBOARD_READ);
  return dashboardRepo.getKPIs(user.id, isAdmin(user));
}

export async function getCharts(user: AuthenticatedUser): Promise<DashboardCharts> {
  assertCan(user, Actions.DASHBOARD_READ);
  return dashboardRepo.getCharts(user.id, isAdmin(user));
}

export async function getUpcomingFollowups(user: AuthenticatedUser): Promise<UpcomingFollowup[]> {
  assertCan(user, Actions.DASHBOARD_READ);
  return dashboardRepo.getUpcomingFollowups(user.id, isAdmin(user));
}

export async function getRecentActivity(user: AuthenticatedUser): Promise<RecentActivityEntry[]> {
  assertCan(user, Actions.DASHBOARD_READ);
  return dashboardRepo.getRecentActivity(user.id, isAdmin(user));
}
