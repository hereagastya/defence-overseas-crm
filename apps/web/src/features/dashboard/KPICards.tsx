import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardKPIs } from './api';

interface TrendProps {
  current: number;
  previous: number;
  unit?: string;
}

function Trend({ current, previous, unit = '' }: TrendProps) {
  const diff = current - previous;
  const pct = previous > 0 ? Math.round(Math.abs(diff / previous) * 100) : null;

  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        No change
      </span>
    );
  }

  const up = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {pct !== null ? `${pct}%` : `${Math.abs(diff)}${unit}`} vs last month
    </span>
  );
}

interface KPICardProps {
  title: string;
  value: string | number;
  children?: React.ReactNode;
}

function KPICard({ title, value, children }: KPICardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function KPICardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

interface Props {
  data?: DashboardKPIs;
  isLoading: boolean;
}

export function KPICards({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KPICard title="Lead Conversion Rate" value={`${data.lead_conversion_rate}%`} />

      <KPICard title="Leads This Month" value={data.leads_this_month}>
        <Trend current={data.leads_this_month} previous={data.leads_last_month} />
      </KPICard>

      <KPICard title="Students Enrolled This Month" value={data.students_this_month}>
        <Trend current={data.students_this_month} previous={data.students_last_month} />
      </KPICard>

      <KPICard title="Tasks Completed (Month)" value={data.tasks_completed_this_month} />

      <KPICard title="Follow-ups Completed (Month)" value={data.followups_completed_this_month} />
    </div>
  );
}
