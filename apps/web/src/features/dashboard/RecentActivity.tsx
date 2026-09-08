import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecentActivityEntry } from './api';

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-primary/10 text-primary',
  updated: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',
  assigned: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
  converted: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
  deleted: 'bg-destructive/10 text-destructive',
  completed: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300',
};

function avatarColor(name: string | null) {
  const colors = [
    'bg-primary/20 text-primary',
    'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  ];
  const idx = (name ?? 'S').charCodeAt(0) % colors.length;
  return colors[idx];
}

function initials(name: string | null) {
  if (!name) return 'S';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function timeAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ');
}

function entityLabel(type: string) {
  const map: Record<string, string> = {
    lead: 'lead',
    student: 'student',
    task: 'task',
    follow_up: 'follow-up',
    payment: 'payment',
    user: 'user',
  };
  return map[type] ?? type;
}

interface Props {
  data?: RecentActivityEntry[];
  isLoading: boolean;
}

export function RecentActivity({ data, isLoading }: Props) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-[15px] font-bold">Recent Activity</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">Latest actions across the CRM</p>
        </div>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {data.map((entry, i) => {
              const actionWord = entry.action.split('_')[0];
              const badgeClass = ACTION_COLORS[actionWord] ?? 'bg-muted text-muted-foreground';
              return (
                <div key={entry.id} className="relative flex gap-3 py-2.5">
                  {i < data.length - 1 && (
                    <div className="absolute left-4 top-11 h-[calc(100%-12px)] w-px bg-border" />
                  )}
                  <div
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(entry.actor_name)}`}
                  >
                    {initials(entry.actor_name)}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[13px] text-foreground leading-snug">
                      <span className="font-semibold">{entry.actor_name ?? 'System'}</span>{' '}
                      <span className="text-muted-foreground capitalize">
                        {formatAction(entry.action)}
                      </span>{' '}
                      <span
                        className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${badgeClass}`}
                      >
                        {entityLabel(entry.entity_type)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {timeAgo(entry.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
