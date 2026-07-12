import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@doc/shared';
import type { ApiResponse } from '@doc/shared';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface LeadsReport {
  total: number;
  by_stage: ChartDataPoint[];
  by_source: ChartDataPoint[];
  by_status: ChartDataPoint[];
  by_score: ChartDataPoint[];
  conversions: number;
  conversion_rate: number;
}

export interface RevenueReport {
  total_revenue: number;
  total_agreed: number;
  total_outstanding: number;
  by_category: Array<{ category: string; total_agreed: number; total_collected: number }>;
  monthly: Array<{ month: string; amount: number }>;
}

export interface CounselorPerformanceEntry {
  counselor_id: string;
  counselor_name: string;
  leads_assigned: number;
  students_managed: number;
  conversions: number;
  tasks_completed: number;
  followups_completed: number;
  revenue_collected: number;
}

export interface CounselorPerformanceReport {
  counselors: CounselorPerformanceEntry[];
}

export interface StudentProgressReport {
  total: number;
  by_stage: ChartDataPoint[];
  cases_closed: number;
}

export interface ApplicationsReport {
  total: number;
  by_status: ChartDataPoint[];
  by_university: Array<{ university: string; count: number }>;
}

export interface CountryDistributionReport {
  leads_by_country: ChartDataPoint[];
  students_by_country: ChartDataPoint[];
  leads_by_nationality: ChartDataPoint[];
}

export interface TasksReport {
  total: number;
  by_status: ChartDataPoint[];
  by_priority: ChartDataPoint[];
  completion_rate: number;
  overdue: number;
}

export interface FollowUpsReport {
  total: number;
  by_status: ChartDataPoint[];
  by_type: ChartDataPoint[];
  completion_rate: number;
  overdue: number;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  counselor_id?: string;
}

// ── Query keys ─────────────────────────────────────────────────────────────────

const REPORTS_KEY = ['reports'] as const;

// ── Hooks ──────────────────────────────────────────────────────────────────────

export function useLeadsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'leads', filters],
    queryFn: () =>
      apiClient
        .get<ApiResponse<LeadsReport>>(API_ENDPOINTS.REPORTS.LEADS, { params: filters })
        .then((r) => r.data.data),
  });
}

export function useRevenueReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'revenue', filters],
    queryFn: () =>
      apiClient
        .get<ApiResponse<RevenueReport>>(API_ENDPOINTS.REPORTS.REVENUE, { params: filters })
        .then((r) => r.data.data),
  });
}

export function useCounselorPerformanceReport() {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'counselor-performance'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<CounselorPerformanceReport>>(API_ENDPOINTS.REPORTS.COUNSELOR_PERFORMANCE)
        .then((r) => r.data.data),
  });
}

export function useStudentProgressReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'student-progress', filters],
    queryFn: () =>
      apiClient
        .get<ApiResponse<StudentProgressReport>>(API_ENDPOINTS.REPORTS.STUDENT_PROGRESS, {
          params: filters,
        })
        .then((r) => r.data.data),
  });
}

export function useApplicationsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'applications', filters],
    queryFn: () =>
      apiClient
        .get<ApiResponse<ApplicationsReport>>(API_ENDPOINTS.REPORTS.APPLICATIONS, {
          params: filters,
        })
        .then((r) => r.data.data),
  });
}

export function useCountryDistributionReport() {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'country-distribution'],
    queryFn: () =>
      apiClient
        .get<ApiResponse<CountryDistributionReport>>(API_ENDPOINTS.REPORTS.COUNTRY_DISTRIBUTION)
        .then((r) => r.data.data),
  });
}

export function useTasksReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'tasks', filters],
    queryFn: () =>
      apiClient
        .get<ApiResponse<TasksReport>>(API_ENDPOINTS.REPORTS.TASKS, { params: filters })
        .then((r) => r.data.data),
  });
}

export function useFollowUpsReport(filters: ReportFilters) {
  return useQuery({
    queryKey: [...REPORTS_KEY, 'follow-ups', filters],
    queryFn: () =>
      apiClient
        .get<ApiResponse<FollowUpsReport>>(API_ENDPOINTS.REPORTS.FOLLOW_UPS, { params: filters })
        .then((r) => r.data.data),
  });
}
