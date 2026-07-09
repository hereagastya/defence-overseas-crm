import { Activity } from 'lucide-react';
import { useStudentTimeline } from './api';
import type { StudentActivityEntry } from './api';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  studentId: string;
}

const ACTION_LABELS: Record<string, string> = {
  lead_created: 'Lead Created',
  lead_updated: 'Lead Updated',
  lead_stage_changed: 'Lead Stage Changed',
  lead_assigned: 'Lead Assigned',
  lead_converted: 'Lead Converted to Student',
  student_created: 'Student Created',
  student_updated: 'Student Updated',
  student_stage_changed: 'Student Stage Changed',
  student_assigned: 'Student Assigned',
  note_created: 'Note Added',
  note_updated: 'Note Updated',
  note_deleted: 'Note Deleted',
  task_created: 'Task Created',
  task_completed: 'Task Completed',
  followup_created: 'Follow-up Scheduled',
  followup_completed: 'Follow-up Completed',
};

function formatDateTime(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function activityDescription(entry: StudentActivityEntry): string | null {
  if (
    (entry.action === 'lead_stage_changed' || entry.action === 'student_stage_changed') &&
    entry.previous_value &&
    entry.new_value
  ) {
    const from = String(entry.previous_value.stage ?? entry.previous_value.student_stage ?? '');
    const to = String(entry.new_value.stage ?? entry.new_value.student_stage ?? '');
    if (from && to) return `${from.replace(/_/g, ' ')} → ${to.replace(/_/g, ' ')}`;
  }
  return null;
}

function TimelineEntry({ entry }: { entry: StudentActivityEntry }) {
  const label = ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, ' ');
  const description = activityDescription(entry);

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{description}</p>
        )}
        {Boolean(entry.metadata?.notes) && (
          <p className="text-xs text-muted-foreground mt-0.5 italic">
            &ldquo;{String(entry.metadata?.notes)}&rdquo;
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {entry.actor_name ?? 'System'} &middot; {formatDateTime(entry.created_at)}
        </p>
      </div>
    </div>
  );
}

export function StudentTimeline({ studentId }: Props) {
  const { data: entries, isLoading } = useStudentTimeline(studentId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
    );
  }

  if (!entries?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Activity className="mb-2 h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No timeline entries yet.</p>
      </div>
    );
  }

  return (
    <div className="pt-2">
      {entries.map((entry) => (
        <TimelineEntry key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
