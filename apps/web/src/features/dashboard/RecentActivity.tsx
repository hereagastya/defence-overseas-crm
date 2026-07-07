import { Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecentActivityEntry } from './api';

function formatAction(action: string) {
  return action.replace(/_/g, ' ');
}

function entityLabel(type: string) {
  switch (type) {
    case 'lead':
      return 'Lead';
    case 'student':
      return 'Student';
    case 'task':
      return 'Task';
    case 'follow_up':
      return 'Follow-up';
    case 'payment':
      return 'Payment';
    case 'user':
      return 'User';
    default:
      return type;
  }
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

interface Props {
  data?: RecentActivityEntry[];
  isLoading: boolean;
}

export function RecentActivity({ data, isLoading }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="space-y-1">
            {data.map((entry, i) => (
              <div key={entry.id} className="relative flex gap-3 py-2">
                {i < data.length - 1 && (
                  <div className="absolute left-3.5 top-9 h-full w-px bg-border" />
                )}
                <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-semibold text-muted-foreground">
                  {entityLabel(entry.entity_type).charAt(0)}
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{entry.actor_name ?? 'System'}</span>{' '}
                    <span className="text-muted-foreground capitalize">
                      {formatAction(entry.action)}
                    </span>{' '}
                    <span className="text-muted-foreground">
                      {entityLabel(entry.entity_type).toLowerCase()}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo(entry.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
