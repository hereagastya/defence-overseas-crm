import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import {
  useDashboardSummary,
  useDashboardKPIs,
  useDashboardCharts,
  useUpcomingFollowups,
  useRecentActivity,
} from './api';
import { SummaryCards } from './SummaryCards';
import { ChartsSection } from './ChartsSection';
import { UpcomingFollowups } from './UpcomingFollowups';
import { RecentActivity } from './RecentActivity';

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const summary = useDashboardSummary();
  const kpis = useDashboardKPIs();
  const charts = useDashboardCharts();
  const followups = useUpcomingFollowups();
  const activity = useRecentActivity();

  const isRefreshing =
    summary.isFetching ||
    kpis.isFetching ||
    charts.isFetching ||
    followups.isFetching ||
    activity.isFetching;

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }

  const firstName = user?.full_name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground leading-tight">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your pipeline today.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 mt-1 rounded-xl"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI stat cards */}
      {(summary.isError || kpis.isError) && <ErrorState message="Failed to load summary data." />}
      <SummaryCards
        summaryData={summary.data}
        kpiData={kpis.data}
        isLoading={summary.isLoading || kpis.isLoading}
      />

      {/* Charts */}
      {charts.isError && <ErrorState message="Failed to load chart data." />}
      <ChartsSection data={charts.data} isLoading={charts.isLoading} />

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingFollowups data={followups.data} isLoading={followups.isLoading} />
        <RecentActivity data={activity.data} isLoading={activity.isLoading} />
      </div>
    </div>
  );
}
