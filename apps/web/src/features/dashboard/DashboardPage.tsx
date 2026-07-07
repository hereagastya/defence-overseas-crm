import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  useDashboardSummary,
  useDashboardKPIs,
  useDashboardCharts,
  useUpcomingFollowups,
  useRecentActivity,
} from './api';
import { SummaryCards } from './SummaryCards';
import { KPICards } from './KPICards';
import { ChartsSection } from './ChartsSection';
import { UpcomingFollowups } from './UpcomingFollowups';
import { RecentActivity } from './RecentActivity';

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}

export function DashboardPage() {
  const queryClient = useQueryClient();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your pipeline and activity</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {summary.isError && <ErrorState message="Failed to load summary data." />}
      <SummaryCards data={summary.data} isLoading={summary.isLoading} />

      {kpis.isError && <ErrorState message="Failed to load KPI data." />}
      <KPICards data={kpis.data} isLoading={kpis.isLoading} />

      {charts.isError && <ErrorState message="Failed to load chart data." />}
      <ChartsSection data={charts.data} isLoading={charts.isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingFollowups data={followups.data} isLoading={followups.isLoading} />
        <RecentActivity data={activity.data} isLoading={activity.isLoading} />
      </div>
    </div>
  );
}
