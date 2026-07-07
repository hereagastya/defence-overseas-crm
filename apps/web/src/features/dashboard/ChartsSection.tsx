import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardCharts, ChartDataPoint } from './api';

function HorizontalBarChart({
  data,
  emptyMessage = 'No data',
}: {
  data: ChartDataPoint[];
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map(({ label, value }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-right text-xs text-muted-foreground capitalize">
            {label.replace(/_/g, ' ')}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-xs font-medium text-foreground">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function RevenueBarChart({ data }: { data: Array<{ month: string; amount: number }> }) {
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="mt-2">
      <div className="flex items-end gap-1" style={{ height: '120px' }}>
        {data.map(({ month, amount }) => {
          const pct = (amount / max) * 100;
          const monthLabel = month.slice(5); // "MM"
          return (
            <div key={month} className="group relative flex flex-1 flex-col items-center gap-1">
              <div className="absolute -top-6 hidden rounded bg-popover px-1.5 py-0.5 text-xs shadow group-hover:block">
                ₹{amount.toLocaleString()}
              </div>
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t bg-primary/70 transition-all group-hover:bg-primary"
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{monthLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 flex-1" />
          <Skeleton className="h-3 w-6" />
        </div>
      ))}
    </div>
  );
}

interface Props {
  data?: DashboardCharts;
  isLoading: boolean;
}

export function ChartsSection({ data, isLoading }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Leads by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <HorizontalBarChart data={data?.leads_by_stage ?? []} emptyMessage="No leads yet" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Leads by Source</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <HorizontalBarChart data={data?.leads_by_source ?? []} emptyMessage="No leads yet" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Students by Stage</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ChartSkeleton />
          ) : (
            <HorizontalBarChart
              data={data?.students_by_stage ?? []}
              emptyMessage="No students yet"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monthly Revenue (12 mo.)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <RevenueBarChart data={data?.monthly_revenue ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
