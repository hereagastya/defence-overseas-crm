import { Activity } from 'lucide-react';
import { useLeadActivity } from './api';
import type { ActivityEntry } from './api';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';

interface Props {
  leadId: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'Created lead',
  updated: 'Updated lead',
  stage_changed: 'Changed stage',
  assigned: 'Assigned counselor',
  converted: 'Converted to student',
  note_added: 'Added a note',
  deleted: 'Deleted lead',
};

function activityDescription(entry: ActivityEntry): string {
  const base = ACTION_LABELS[entry.action] ?? entry.action;
  if (entry.action === 'stage_changed') {
    const prev = String(entry.previous_value?.lead_stage ?? '');
    const next = String(entry.new_value?.lead_stage ?? '');
    if (prev && next) return `${base}: ${prev.replace(/_/g, ' ')} → ${next.replace(/_/g, ' ')}`;
  }
  if (entry.action === 'assigned') {
    return base;
  }
  return base;
}

function ActivityItem({ entry }: { entry: ActivityEntry }) {
  return (
    <div className="flex gap-3 relative">
      <div className="flex flex-col items-center">
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Activity className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-4 min-w-0 flex-1">
        <p className="text-sm text-foreground">{activityDescription(entry)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {entry.actor_name ?? 'System'} &middot; {formatDateTime(entry.created_at)}
        </p>
        {Boolean(entry.metadata?.notes) && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            &ldquo;{String(entry.metadata?.notes)}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

export function LeadActivity({ leadId }: Props) {
  const { data: entries, isLoading, isError } = useLeadActivity(leadId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive py-4">Failed to load activity log.</p>;
  }

  if (!entries?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Activity className="mb-2 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="pt-2">
      {entries.map((entry) => (
        <ActivityItem key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
