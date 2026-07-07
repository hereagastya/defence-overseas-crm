import { Users, UserCheck, CheckSquare, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSummary } from './api';

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  iconClass?: string;
  danger?: boolean;
}

function StatCard({ label, value, sub, icon: Icon, iconClass, danger }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${danger ? 'text-destructive' : 'text-foreground'}`}>
              {value.toLocaleString()}
            </p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2 ${iconClass ?? 'bg-primary/10'}`}>
            <Icon className={`h-5 w-5 ${danger ? 'text-destructive' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  data?: DashboardSummary;
  isLoading: boolean;
}

export function SummaryCards({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Leads" value={data.total_leads} icon={Users} />
      <StatCard
        label="Leads This Month"
        value={data.leads_this_month}
        sub="new this month"
        icon={Users}
        iconClass="bg-blue-100 dark:bg-blue-900/30"
      />
      <StatCard label="Total Students" value={data.total_students} icon={UserCheck} />
      <StatCard
        label="Active Students"
        value={data.students_active}
        sub="currently enrolled"
        icon={UserCheck}
        iconClass="bg-green-100 dark:bg-green-900/30"
      />
      <StatCard label="Open Tasks" value={data.open_tasks} icon={CheckSquare} />
      <StatCard
        label="Overdue Tasks"
        value={data.overdue_tasks}
        icon={AlertTriangle}
        danger={data.overdue_tasks > 0}
      />
      <StatCard label="Scheduled Follow-ups" value={data.scheduled_followups} icon={Calendar} />
      <StatCard
        label="Overdue Follow-ups"
        value={data.overdue_followups}
        icon={Clock}
        danger={data.overdue_followups > 0}
      />
    </div>
  );
}
