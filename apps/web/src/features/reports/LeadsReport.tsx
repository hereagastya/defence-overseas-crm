import { Download } from 'lucide-react';
import {
  LEAD_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_SCORE_LABELS,
} from '@doc/shared';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadsReport } from './api';
import type { ReportFilters } from './api';
import { StatCard, ChartCard, HorizontalBarChart, ReportError } from './charts';
import { exportToCsv } from './utils';

interface Props {
  filters: ReportFilters;
}

export function LeadsReport({ filters }: Props) {
  const { data, isLoading, isError } = useLeadsReport(filters);

  function handleExport() {
    if (!data) return;
    exportToCsv('leads-report.csv', [
      { metric: 'Total Leads', value: data.total },
      { metric: 'Conversions', value: data.conversions },
      { metric: 'Conversion Rate', value: `${data.conversion_rate}%` },
      ...data.by_stage.map((d) => ({
        metric: `Stage: ${LEAD_STAGE_LABELS[d.label as keyof typeof LEAD_STAGE_LABELS] ?? d.label}`,
        value: d.value,
      })),
    ]);
  }

  if (isError) return <ReportError message="Failed to load leads report." />;

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
            <StatCard title="Total Leads" value={data?.total ?? 0} />
            <StatCard title="Conversions" value={data?.conversions ?? 0} accent="success" />
            <StatCard
              title="Conversion Rate"
              value={`${data?.conversion_rate ?? 0}%`}
              sub="leads converted to students"
              accent={
                (data?.conversion_rate ?? 0) >= 50
                  ? 'success'
                  : (data?.conversion_rate ?? 0) >= 20
                    ? 'warning'
                    : 'destructive'
              }
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Leads by Stage" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.by_stage ?? []}
            emptyMessage="No stage data"
            formatLabel={(l) =>
              LEAD_STAGE_LABELS[l as keyof typeof LEAD_STAGE_LABELS] ?? l.replace(/_/g, ' ')
            }
          />
        </ChartCard>

        <ChartCard title="Leads by Source" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.by_source ?? []}
            emptyMessage="No source data"
            formatLabel={(l) =>
              LEAD_SOURCE_LABELS[l as keyof typeof LEAD_SOURCE_LABELS] ?? l.replace(/_/g, ' ')
            }
          />
        </ChartCard>

        <ChartCard title="Leads by Status" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.by_status ?? []}
            emptyMessage="No status data"
            formatLabel={(l) =>
              LEAD_STATUS_LABELS[l as keyof typeof LEAD_STATUS_LABELS] ?? l.replace(/_/g, ' ')
            }
          />
        </ChartCard>

        <ChartCard title="Leads by Score" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.by_score ?? []}
            emptyMessage="No score data"
            formatLabel={(l) =>
              LEAD_SCORE_LABELS[l as keyof typeof LEAD_SCORE_LABELS] ?? l.replace(/_/g, ' ')
            }
          />
        </ChartCard>
      </div>
    </div>
  );
}
