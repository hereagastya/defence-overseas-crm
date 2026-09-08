import { Phone, Mail, Users, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { UpcomingFollowup } from './api';

const TYPE_META: Record<string, { label: string; icon: React.ElementType; accent: string }> = {
  call: { label: 'Call', icon: Phone, accent: 'bg-primary/10 text-primary' },
  email: {
    label: 'Email',
    icon: Mail,
    accent: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
  },
  meeting: {
    label: 'Meet',
    icon: Users,
    accent: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
  },
};

function typeMeta(type: string) {
  return (
    TYPE_META[type.toLowerCase()] ?? {
      label: type,
      icon: CalendarDays,
      accent: 'bg-muted text-muted-foreground',
    }
  );
}

function formatScheduled(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface Props {
  data?: UpcomingFollowup[];
  isLoading: boolean;
}

export function UpcomingFollowups({ data, isLoading }: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-[15px] font-bold">Upcoming Follow-ups</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Next 7 days</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
          {isLoading ? '…' : (data?.length ?? 0)}
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <Skeleton className="h-8 w-8 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No upcoming follow-ups</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((f) => {
              const meta = typeMeta(f.type);
              const Icon = meta.icon;
              return (
                <div key={f.id} className="flex items-center gap-3 py-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm ${meta.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">
                      {f.lead_name ?? f.student_name ?? 'Unknown'}
                    </p>
                    {f.assigned_to_name && (
                      <p className="text-[11px] text-muted-foreground">{f.assigned_to_name}</p>
                    )}
                  </div>
                  <time className="shrink-0 text-[11px] font-medium text-muted-foreground">
                    {formatScheduled(f.scheduled_at)}
                  </time>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
