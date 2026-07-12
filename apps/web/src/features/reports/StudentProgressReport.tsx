import { Download } from 'lucide-react';
import { STUDENT_STAGE_LABELS } from '@doc/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudentProgressReport } from './api';
import type { ReportFilters } from './api';
import { StatCard, ChartCard, HorizontalBarChart, ReportError } from './charts';
import { exportToCsv } from './utils';

interface Props {
  filters: ReportFilters;
}

export function StudentProgressReport({ filters }: Props) {
  const { data, isLoading, isError } = useStudentProgressReport(filters);

  function handleExport() {
    if (!data) return;
    exportToCsv('student-progress.csv', [
      { metric: 'Total Students', value: data.total },
      { metric: 'Cases Closed', value: data.cases_closed },
      { metric: 'Active Cases', value: data.total - data.cases_closed },
      ...data.by_stage.map((d) => ({
        stage:
          STUDENT_STAGE_LABELS[d.label as keyof typeof STUDENT_STAGE_LABELS] ??
          d.label.replace(/_/g, ' '),
        count: d.value,
      })),
    ]);
  }

  if (isError) return <ReportError message="Failed to load student progress report." />;

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
            <StatCard title="Total Students" value={data?.total ?? 0} />
            <StatCard
              title="Active Cases"
              value={(data?.total ?? 0) - (data?.cases_closed ?? 0)}
              accent="success"
            />
            <StatCard
              title="Cases Closed"
              value={data?.cases_closed ?? 0}
              sub="completed journeys"
            />
          </>
        )}
      </div>

      {/* Stage breakdown */}
      <ChartCard title="Students by Journey Stage" isLoading={isLoading}>
        <HorizontalBarChart
          data={data?.by_stage ?? []}
          emptyMessage="No stage data"
          maxItems={22}
          formatLabel={(l) =>
            STUDENT_STAGE_LABELS[l as keyof typeof STUDENT_STAGE_LABELS] ?? l.replace(/_/g, ' ')
          }
        />
      </ChartCard>
    </div>
  );
}
