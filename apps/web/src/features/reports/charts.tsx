import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ChartDataPoint } from './api';

// ── Horizontal bar chart ───────────────────────────────────────────────────────

interface HorizontalBarChartProps {
  data: ChartDataPoint[];
  emptyMessage?: string;
  maxItems?: number;
  formatLabel?: (label: string) => string;
}

export function HorizontalBarChart({
  data,
  emptyMessage = 'No data',
  maxItems = 10,
  formatLabel,
}: HorizontalBarChartProps) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = formatLabel ?? ((l: string) => l.replace(/_/g, ' '));

  return (
    <div className="space-y-2.5">
      {data.slice(0, maxItems).map(({ label, value }) => (
        <div key={label} className="flex items-center gap-3">
          <span className="w-36 shrink-0 truncate text-right text-xs text-muted-foreground capitalize">
            {fmt(label)}
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

// ── Monthly vertical bar chart ─────────────────────────────────────────────────

interface MonthlyBarChartProps {
  data: Array<{ month: string; amount: number }>;
  formatValue?: (v: number) => string;
}

export function MonthlyBarChart({ data, formatValue }: MonthlyBarChartProps) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const fmt = formatValue ?? ((v: number) => `₹${v.toLocaleString('en-IN')}`);

  return (
    <div className="mt-2">
      <div className="flex items-end gap-1" style={{ height: '120px' }}>
        {data.map(({ month, amount }) => {
          const pct = (amount / max) * 100;
          const label = month.slice(5);
          return (
            <div key={month} className="group relative flex flex-1 flex-col items-center gap-1">
              <div className="absolute -top-6 hidden rounded bg-popover px-1.5 py-0.5 text-xs shadow group-hover:block whitespace-nowrap">
                {fmt(amount)}
              </div>
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t bg-primary/70 transition-all group-hover:bg-primary"
                  style={{ height: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string | number;
  sub?: string;
  accent?: 'default' | 'success' | 'warning' | 'destructive';
}

export function StatCard({ title, value, sub, accent = 'default' }: StatCardProps) {
  const valueClass = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    destructive: 'text-destructive',
  }[accent];

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Chart card ─────────────────────────────────────────────────────────────────

export function ChartCard({
  title,
  children,
  isLoading,
}: {
  title: string;
  children: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2 flex-1" />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// ── Error state ────────────────────────────────────────────────────────────────

export function ReportError({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}
