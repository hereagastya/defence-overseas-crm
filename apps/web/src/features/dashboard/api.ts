import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@doc/shared';
import type { ApiResponse } from '@doc/shared';

export interface DashboardSummary {
  total_leads: number;
  leads_this_month: number;
  total_students: number;
  students_active: number;
  open_tasks: number;
  overdue_tasks: number;
  scheduled_followups: number;
  overdue_followups: number;
}

export interface DashboardKPIs {
  lead_conversion_rate: number;
  leads_this_month: number;
  leads_last_month: number;
  students_this_month: number;
  students_last_month: number;
  tasks_completed_this_month: number;
  followups_completed_this_month: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface DashboardCharts {
  leads_by_stage: ChartDataPoint[];
  leads_by_source: ChartDataPoint[];
  students_by_stage: ChartDataPoint[];
  monthly_revenue: Array<{ month: string; amount: number }>;
}

export interface UpcomingFollowup {
  id: string;
  type: string;
  scheduled_at: string;
  lead_id: string | null;
  student_id: string | null;
  assigned_to: string;
  assigned_to_name: string | null;
  lead_name: string | null;
  student_name: string | null;
}

export interface RecentActivityEntry {
  id: string;
  actor_id: string;
  actor_name: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  created_at: string;
}

const KEYS = {
  summary: ['dashboard', 'summary'] as const,
  kpis: ['dashboard', 'kpis'] as const,
  charts: ['dashboard', 'charts'] as const,
  upcomingFollowups: ['dashboard', 'upcoming-follow-ups'] as const,
  recentActivity: ['dashboard', 'recent-activity'] as const,
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: KEYS.summary,
    queryFn: () =>
      apiClient
        .get<ApiResponse<DashboardSummary>>(API_ENDPOINTS.DASHBOARD.SUMMARY)
        .then((r) => r.data.data),
  });
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: KEYS.kpis,
    queryFn: () =>
      apiClient
        .get<ApiResponse<DashboardKPIs>>(API_ENDPOINTS.DASHBOARD.KPIS)
        .then((r) => r.data.data),
  });
}

export function useDashboardCharts() {
  return useQuery({
    queryKey: KEYS.charts,
    queryFn: () =>
      apiClient
        .get<ApiResponse<DashboardCharts>>(API_ENDPOINTS.DASHBOARD.CHARTS)
        .then((r) => r.data.data),
  });
}

export function useUpcomingFollowups() {
  return useQuery({
    queryKey: KEYS.upcomingFollowups,
    queryFn: () =>
      apiClient
        .get<ApiResponse<UpcomingFollowup[]>>(API_ENDPOINTS.DASHBOARD.UPCOMING_FOLLOWUPS)
        .then((r) => r.data.data),
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: KEYS.recentActivity,
    queryFn: () =>
      apiClient
        .get<ApiResponse<RecentActivityEntry[]>>(API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITY)
        .then((r) => r.data.data),
  });
}
