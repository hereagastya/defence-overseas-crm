import { Download } from 'lucide-react';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@doc/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasksReport } from './api';
import type { ReportFilters } from './api';
import { StatCard, ChartCard, HorizontalBarChart, ReportError } from './charts';
import { exportToCsv } from './utils';

interface Props {
  filters: ReportFilters;
}

export function TasksReport({ filters }: Props) {
  const { data, isLoading, isError } = useTasksReport(filters);

  function handleExport() {
    if (!data) return;
    exportToCsv('tasks-report.csv', [
      { metric: 'Total Tasks', value: data.total },
      { metric: 'Overdue', value: data.overdue },
      { metric: 'Completion Rate', value: `${data.completion_rate}%` },
      ...data.by_status.map((d) => ({
        metric: `Status: ${TASK_STATUS_LABELS[d.label as keyof typeof TASK_STATUS_LABELS] ?? d.label}`,
        count: d.value,
      })),
      ...data.by_priority.map((d) => ({
        metric: `Priority: ${TASK_PRIORITY_LABELS[d.label as keyof typeof TASK_PRIORITY_LABELS] ?? d.label}`,
        count: d.value,
      })),
    ]);
  }

  if (isError) return <ReportError message="Failed to load tasks report." />;

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
            <StatCard title="Total Tasks" value={data?.total ?? 0} />
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
        <ChartCard title="Tasks by Status" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.by_status ?? []}
            emptyMessage="No tasks yet"
            formatLabel={(l) =>
              TASK_STATUS_LABELS[l as keyof typeof TASK_STATUS_LABELS] ?? l.replace(/_/g, ' ')
            }
          />
        </ChartCard>

        <ChartCard title="Tasks by Priority" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.by_priority ?? []}
            emptyMessage="No tasks yet"
            formatLabel={(l) =>
              TASK_PRIORITY_LABELS[l as keyof typeof TASK_PRIORITY_LABELS] ?? l.replace(/_/g, ' ')
            }
          />
        </ChartCard>
      </div>
    </div>
  );
}
