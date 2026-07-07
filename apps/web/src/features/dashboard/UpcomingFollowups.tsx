import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { UpcomingFollowup } from './api';

function typeBadgeVariant(type: string): 'default' | 'secondary' | 'outline' | 'info' {
  switch (type) {
    case 'call':
      return 'default';
    case 'meeting':
      return 'secondary';
    case 'email':
      return 'outline';
    default:
      return 'info';
  }
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
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-base">Upcoming Follow-ups</CardTitle>
        <span className="ml-auto text-xs text-muted-foreground">Next 7 days</span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No upcoming follow-ups in the next 7 days.
          </p>
        ) : (
          <div className="divide-y">
            {data.map((f) => (
              <div key={f.id} className="flex items-center gap-3 py-2.5">
                <Badge variant={typeBadgeVariant(f.type)} className="capitalize">
                  {f.type}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {f.lead_name ?? f.student_name ?? 'Unknown'}
                  </p>
                  {f.assigned_to_name && (
                    <p className="text-xs text-muted-foreground">{f.assigned_to_name}</p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {formatScheduled(f.scheduled_at)}
                </time>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
