import { Download } from 'lucide-react';
import { APPLICATION_STATUS_LABELS } from '@doc/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplicationsReport } from './api';
import type { ReportFilters } from './api';
import { StatCard, ChartCard, HorizontalBarChart, ReportError } from './charts';
import { exportToCsv } from './utils';

interface Props {
  filters: ReportFilters;
}

export function ApplicationsReport({ filters }: Props) {
  const { data, isLoading, isError } = useApplicationsReport(filters);

  function handleExport() {
    if (!data) return;
    exportToCsv('applications-report.csv', [
      { metric: 'Total Applications', value: data.total },
      ...data.by_status.map((d) => ({
        status:
          APPLICATION_STATUS_LABELS[d.label as keyof typeof APPLICATION_STATUS_LABELS] ?? d.label,
        count: d.value,
      })),
    ]);
  }

  if (isError) return <ReportError message="Failed to load applications report." />;

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
      <div className="grid gap-4 sm:grid-cols-1 max-w-xs">
        {isLoading ? (
          <div className="rounded-lg border p-6">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 w-16" />
          </div>
        ) : (
          <StatCard title="Total Applications" value={data?.total ?? 0} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Applications by Status" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.by_status ?? []}
            emptyMessage="No applications yet"
            formatLabel={(l) =>
              APPLICATION_STATUS_LABELS[l as keyof typeof APPLICATION_STATUS_LABELS] ??
              l.replace(/_/g, ' ')
            }
          />
        </ChartCard>

        {/* By university */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Universities</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : (data?.by_university ?? []).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No university data yet
              </p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {(data?.by_university ?? []).slice(0, 15).map((u) => (
                  <div key={u.university} className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground truncate">{u.university}</span>
                    <span className="shrink-0 text-xs font-medium">{u.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
