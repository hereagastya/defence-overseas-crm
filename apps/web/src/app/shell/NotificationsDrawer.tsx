import { useState } from 'react';
import { Bell, CheckCircle2, Clock, AlertTriangle, X, CheckCheck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FollowupStatus, FOLLOWUP_TYPE_LABELS } from '@doc/shared';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '@doc/shared';
import type { PaginatedResponse } from '@doc/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';

// ── Local types ────────────────────────────────────────────────────────────────

interface TaskRow {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
  lead_id: string | null;
  student_id: string | null;
}

interface FollowupRow {
  id: string;
  type: string;
  scheduled_at: string;
  status: string;
  lead_id: string | null;
  student_id: string | null;
}

// ── Query hooks ────────────────────────────────────────────────────────────────

function useOverdueTasks() {
  return useQuery({
    queryKey: ['notifications', 'overdue-tasks'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<TaskRow>>(API_ENDPOINTS.TASKS.LIST, {
          params: { overdue_only: true, limit: 10, page: 1 },
        })
        .then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
  });
}

function useOverdueFollowUps() {
  return useQuery({
    queryKey: ['notifications', 'overdue-followups'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<FollowupRow>>(API_ENDPOINTS.FOLLOW_UPS.LIST, {
          params: { overdue_only: true, limit: 10, page: 1 },
        })
        .then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
  });
}

function useUpcomingFollowUps() {
  return useQuery({
    queryKey: ['notifications', 'upcoming-followups'],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<FollowupRow>>(API_ENDPOINTS.FOLLOW_UPS.LIST, {
          params: { status: FollowupStatus.SCHEDULED, limit: 5, page: 1 },
        })
        .then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  return `in ${diffDays} days`;
}

function entityLink(item: { lead_id: string | null; student_id: string | null }): string | null {
  if (item.lead_id) return `/leads/${item.lead_id}`;
  if (item.student_id) return `/students/${item.student_id}`;
  return null;
}

// ── Notification item ──────────────────────────────────────────────────────────

interface ItemProps {
  icon: React.ReactNode;
  title: string;
  sub: string;
  href: string | null;
  onDismiss: () => void;
  accent?: 'destructive' | 'warning' | 'default';
}

function NotificationItem({ icon, title, sub, href, onDismiss, accent = 'default' }: ItemProps) {
  const iconBg = {
    destructive: 'bg-destructive/10 text-destructive',
    warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    default: 'bg-primary/10 text-primary',
  }[accent];

  const inner = (
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );

  return (
    <div className="flex items-start gap-1 px-4 py-3 hover:bg-muted/40 transition-colors group">
      {href ? (
        <Link to={href} className="flex-1 min-w-0">
          {inner}
        </Link>
      ) : (
        inner
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-1 px-4 py-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1.5">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function NotificationsDrawer() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const overdueTasks = useOverdueTasks();
  const overdueFollowUps = useOverdueFollowUps();
  const upcomingFollowUps = useUpcomingFollowUps();

  function dismiss(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  function markAllRead() {
    const allIds = [
      ...(overdueTasks.data?.items ?? []).map((t) => `task-${t.id}`),
      ...(overdueFollowUps.data?.items ?? []).map((f) => `fu-overdue-${f.id}`),
      ...(upcomingFollowUps.data?.items ?? []).map((f) => `fu-upcoming-${f.id}`),
    ];
    setDismissed(new Set(allIds));
  }

  const overdueTaskItems = (overdueTasks.data?.items ?? []).filter(
    (t) => !dismissed.has(`task-${t.id}`),
  );
  const overdueFollowUpItems = (overdueFollowUps.data?.items ?? []).filter(
    (f) => !dismissed.has(`fu-overdue-${f.id}`),
  );
  const upcomingFollowUpItems = (upcomingFollowUps.data?.items ?? []).filter(
    (f) => !dismissed.has(`fu-upcoming-${f.id}`) && f.status !== FollowupStatus.COMPLETED,
  );

  const totalUnread =
    overdueTaskItems.length + overdueFollowUpItems.length + upcomingFollowUpItems.length;
  const isLoading =
    overdueTasks.isLoading || overdueFollowUps.isLoading || upcomingFollowUps.isLoading;
  const isError = overdueTasks.isError || overdueFollowUps.isError || upcomingFollowUps.isError;
  const isEmpty = !isLoading && !isError && totalUnread === 0;

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
        </Button>
        {totalUnread > 0 && (
          <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <SheetHeader className="border-b px-4 py-3 shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base">
                Notifications
                {totalUnread > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {totalUnread}
                  </Badge>
                )}
              </SheetTitle>
              {totalUnread > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={markAllRead}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <SectionSkeleton />
            ) : isError ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground text-center py-16">
                  Could not load notifications.
                </p>
              </div>
            ) : isEmpty ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center py-16">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                  <p className="mt-1 text-xs text-muted-foreground">No pending notifications.</p>
                </div>
              </div>
            ) : (
              <div className="divide-y">
                {/* Overdue tasks */}
                {overdueTaskItems.length > 0 && (
                  <section>
                    <div className="flex items-center gap-1.5 px-4 pt-4 pb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
                        Overdue Tasks ({overdueTaskItems.length})
                      </p>
                    </div>
                    {overdueTaskItems.map((task) => (
                      <NotificationItem
                        key={task.id}
                        icon={<AlertTriangle className="h-3.5 w-3.5" />}
                        title={task.title}
                        sub={`Due ${formatRelativeDate(task.due_date)} · ${task.priority}`}
                        href={entityLink(task)}
                        onDismiss={() => dismiss(`task-${task.id}`)}
                        accent="destructive"
                      />
                    ))}
                  </section>
                )}

                {/* Overdue follow-ups */}
                {overdueFollowUpItems.length > 0 && (
                  <section>
                    <div className="flex items-center gap-1.5 px-4 pt-4 pb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                        Overdue Follow-ups ({overdueFollowUpItems.length})
                      </p>
                    </div>
                    {overdueFollowUpItems.map((fu) => (
                      <NotificationItem
                        key={fu.id}
                        icon={<Clock className="h-3.5 w-3.5" />}
                        title={
                          FOLLOWUP_TYPE_LABELS[fu.type as keyof typeof FOLLOWUP_TYPE_LABELS] ??
                          fu.type
                        }
                        sub={`Scheduled ${formatRelativeDate(fu.scheduled_at)}`}
                        href={entityLink(fu)}
                        onDismiss={() => dismiss(`fu-overdue-${fu.id}`)}
                        accent="warning"
                      />
                    ))}
                  </section>
                )}

                {/* Upcoming follow-ups */}
                {upcomingFollowUpItems.length > 0 && (
                  <section>
                    <div className="flex items-center gap-1.5 px-4 pt-4 pb-2">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Upcoming Follow-ups
                      </p>
                    </div>
                    {upcomingFollowUpItems.map((fu) => (
                      <NotificationItem
                        key={fu.id}
                        icon={<Clock className="h-3.5 w-3.5" />}
                        title={
                          FOLLOWUP_TYPE_LABELS[fu.type as keyof typeof FOLLOWUP_TYPE_LABELS] ??
                          fu.type
                        }
                        sub={`Scheduled ${formatRelativeDate(fu.scheduled_at)}`}
                        href={entityLink(fu)}
                        onDismiss={() => dismiss(`fu-upcoming-${fu.id}`)}
                        accent="default"
                      />
                    ))}
                  </section>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
