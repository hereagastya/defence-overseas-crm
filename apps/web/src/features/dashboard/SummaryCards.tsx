import {
  Users,
  UserCheck,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSummary, DashboardKPIs } from './api';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: { value: number; up: boolean } | null;
  icon: React.ElementType;
  accent?: string; // tailwind bg class for icon bg
  danger?: boolean;
  wide?: boolean;
}

function TrendPill({ trend }: { trend: { value: number; up: boolean } }) {
  const Icon = trend.up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        trend.up
          ? 'bg-primary/10 text-primary dark:bg-primary/20'
          : 'bg-destructive/10 text-destructive'
      }`}
    >
      <Icon className="h-3 w-3" />
      {trend.value}%
    </span>
  );
}

function StatCard({ label, value, sub, trend, icon: Icon, accent, danger, wide }: StatCardProps) {
  return (
    <div
      className={`rounded-[18px] border border-border bg-card p-5 flex flex-col gap-3 ${wide ? 'lg:col-span-2' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent ?? 'bg-muted'}`}
        >
          <Icon className={`h-[18px] w-[18px] ${danger ? 'text-destructive' : 'text-primary'}`} />
        </div>
        {trend && <TrendPill trend={trend} />}
      </div>
      <div>
        <p
          className={`text-[28px] font-extrabold leading-none tracking-tight ${
            danger ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="mt-1.5 text-[13px] font-semibold text-muted-foreground">{label}</p>
        {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-[18px] border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3.5 w-28" />
      </div>
    </div>
  );
}

interface Props {
  summaryData?: DashboardSummary;
  kpiData?: DashboardKPIs;
  isLoading: boolean;
}

function trendVal(current: number, previous: number) {
  if (previous === 0) return null;
  const pct = Math.round(Math.abs((current - previous) / previous) * 100);
  return { value: pct, up: current >= previous };
}

export function SummaryCards({ summaryData, kpiData, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const s = summaryData;
  const k = kpiData;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Total Leads"
        value={s?.total_leads ?? 0}
        sub="all time"
        icon={Users}
        accent="bg-primary/10"
        trend={k ? trendVal(k.leads_this_month, k.leads_last_month) : null}
      />
      <StatCard
        label="Leads This Month"
        value={s?.leads_this_month ?? 0}
        icon={Users}
        accent="bg-primary/10"
        trend={k ? trendVal(k.leads_this_month, k.leads_last_month) : null}
      />
      <StatCard
        label="Students Active"
        value={s?.students_active ?? 0}
        sub={`${s?.total_students ?? 0} total`}
        icon={UserCheck}
        accent="bg-emerald-100 dark:bg-emerald-900/30"
        trend={k ? trendVal(k.students_this_month, k.students_last_month) : null}
      />
      <StatCard
        label="Conversion Rate"
        value={k ? `${k.lead_conversion_rate}%` : '—'}
        sub="leads → students"
        icon={Percent}
        accent="bg-primary/10"
      />
      <StatCard
        label="Open Tasks"
        value={s?.open_tasks ?? 0}
        sub={s && s.overdue_tasks > 0 ? `${s.overdue_tasks} overdue` : 'none overdue'}
        icon={s && s.overdue_tasks > 0 ? AlertTriangle : CheckSquare}
        accent={s && s.overdue_tasks > 0 ? 'bg-destructive/10' : 'bg-muted'}
        danger={s ? s.overdue_tasks > 0 : false}
      />
    </div>
  );
}
