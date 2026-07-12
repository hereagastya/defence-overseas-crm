import { Download } from 'lucide-react';
import { FOLLOWUP_STATUS_LABELS, FOLLOWUP_TYPE_LABELS } from '@doc/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFollowUpsReport } from './api';
import type { ReportFilters } from './api';
import { StatCard, ChartCard, HorizontalBarChart, ReportError } from './charts';
import { exportToCsv } from './utils';

interface Props {
  filters: ReportFilters;
}

export function FollowUpsReport({ filters }: Props) {
  const { data, isLoading, isError } = useFollowUpsReport(filters);

  function handleExport() {
    if (!data) return;
    exportToCsv('followups-report.csv', [
      { metric: 'Total Follow-ups', value: data.total },
      { metric: 'Overdue', value: data.overdue },
      { metric: 'Completion Rate', value: `${data.completion_rate}%` },
      ...data.by_status.map((d) => ({
        metric: `Status: ${FOLLOWUP_STATUS_LABELS[d.label as keyof typeof FOLLOWUP_STATUS_LABELS] ?? d.label}`,
        count: d.value,
      })),
      ...data.by_type.map((d) => ({
        metric: `Type: ${FOLLOWUP_TYPE_LABELS[d.label as keyof typeof FOLLOWUP_TYPE_LABELS] ?? d.label}`,
        count: d.value,
      })),
    ]);
  }

  if (isError) return <ReportError message="Failed to load follow-ups report." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={!data}
          className="gap-2"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))
        ) : (
          <>
            <StatCard title="Total Follow-ups" value={data?.total ?? 0} />
            <StatCard
              title="Overdue"
              value={data?.overdue ?? 0}
              accent={(data?.overdue ?? 0) > 0 ? 'destructive' : 'default'}
            />
            <StatCard
              title="Completion Rate"
              value={`${data?.completion_rate ?? 0}%`}
              accent={
                (data?.completion_rate ?? 0) >= 80
                  ? 'success'
                  : (data?.completion_rate ?? 0) >= 50
                    ? 'warning'
                    : 'destructive'
              }
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Follow-ups by Status" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.by_status ?? []}
            emptyMessage="No follow-ups yet"
            formatLabel={(l) =>
              FOLLOWUP_STATUS_LABELS[l as keyof typeof FOLLOWUP_STATUS_LABELS] ??
              l.replace(/_/g, ' ')
            }
          />
        </ChartCard>

        <ChartCard title="Follow-ups by Type" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.by_type ?? []}
            emptyMessage="No follow-ups yet"
            formatLabel={(l) =>
              FOLLOWUP_TYPE_LABELS[l as keyof typeof FOLLOWUP_TYPE_LABELS] ?? l.replace(/_/g, ' ')
            }
          />
        </ChartCard>
      </div>
    </div>
  );
}
