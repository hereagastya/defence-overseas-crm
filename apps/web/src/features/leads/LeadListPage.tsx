import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, MoreHorizontal, Plus, RefreshCw, Trash2, Users2 } from 'lucide-react';
import {
  UserRole,
  LeadStage,
  LeadSource,
  LEAD_STAGE_LABELS,
  LEAD_SOURCE_LABELS,
} from '@doc/shared';
import type { LeadWithCounselor, LeadFiltersInput } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { DataTable } from '@/components/DataTable';
import type { ColumnDef } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useLeads, useDeleteLead } from './api';
import { CreateLeadDialog } from './CreateLeadDialog';
import { formatDate } from '@/lib/format';

const PAGE_SIZE = 25;

type SortableKey = 'created_at' | 'updated_at' | 'full_name' | 'lead_stage' | 'lead_score';

const STAGE_BADGE_VARIANTS: Record<LeadStage, 'default' | 'secondary' | 'destructive' | 'outline'> =
  {
    [LeadStage.NEW_INQUIRY]: 'outline',
    [LeadStage.PRE_COUNSELING]: 'secondary',
    [LeadStage.ONE_TO_ONE_COUNSELING]: 'secondary',
    [LeadStage.MOCK_TEST]: 'secondary',
    [LeadStage.WEBINAR]: 'secondary',
    [LeadStage.REGISTRATION]: 'default',
    [LeadStage.POST_COUNSELING]: 'default',
    [LeadStage.REGISTRATION_COMPLETED]: 'default',
    [LeadStage.CONVERTED_TO_STUDENT]: 'destructive',
  };

function StageBadge({ stage }: { stage: LeadStage }) {
  return (
    <Badge
      variant={STAGE_BADGE_VARIANTS[stage] ?? 'outline'}
      className="text-[10px] whitespace-nowrap"
    >
      {LEAD_STAGE_LABELS[stage]}
    </Badge>
  );
}

function ScoreBadge({ score }: { score: string }) {
  const variant =
    score === 'hot'
      ? ('destructive' as const)
      : score === 'warm'
        ? ('default' as const)
        : ('secondary' as const);
  return (
    <Badge variant={variant} className="text-[10px]">
      {score.charAt(0).toUpperCase() + score.slice(1)}
    </Badge>
  );
}

interface RowActionsProps {
  lead: LeadWithCounselor;
  isAdmin: boolean;
  onDelete: () => void;
}

function RowActions({ lead, isAdmin, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/leads/${lead.id}`}>View</Link>
        </DropdownMenuItem>
        {isAdmin && lead.lead_stage !== LeadStage.CONVERTED_TO_STUDENT && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const ALL = '__all__';

export function LeadListPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortableKey>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stageFilter, setStageFilter] = useState<LeadStage | ''>('');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeadWithCounselor | null>(null);

  const filters = useMemo<LeadFiltersInput>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      stage: stageFilter || undefined,
      source: sourceFilter || undefined,
    }),
    [page, search, sortBy, sortOrder, stageFilter, sourceFilter],
  );

  const { data, isLoading, isError, refetch } = useLeads(filters);
  const { mutate: deleteLead, isPending: isDeleting } = useDeleteLead();

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  function handleSortChange(id: string, order: 'asc' | 'desc') {
    setSortBy(id as SortableKey);
    setSortOrder(order);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStageChange(value: string) {
    setStageFilter(value === ALL ? '' : (value as LeadStage));
    setPage(1);
  }

  function handleSourceChange(value: string) {
    setSourceFilter(value === ALL ? '' : (value as LeadSource));
    setPage(1);
  }

  const columns: ColumnDef<LeadWithCounselor>[] = [
    {
      id: 'full_name',
      header: 'Name',
      sortable: true,
      cell: (row) => (
        <Link to={`/leads/${row.id}`} className="font-medium hover:underline">
          {row.full_name}
        </Link>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      accessorKey: 'phone',
    },
    {
      id: 'lead_stage',
      header: 'Stage',
      sortable: true,
      cell: (row) => <StageBadge stage={row.lead_stage} />,
    },
    {
      id: 'lead_score',
      header: 'Score',
      sortable: true,
      cell: (row) => <ScoreBadge score={row.lead_score} />,
    },
    {
      id: 'counselor',
      header: 'Counselor',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.counselor_name ?? <span className="italic">Unassigned</span>}
        </span>
      ),
    },
    {
      id: 'country',
      header: 'Country',
      cell: (row) => <span className="text-sm text-muted-foreground">{row.country ?? '—'}</span>,
    },
    {
      id: 'created_at',
      header: 'Created',
      sortable: true,
      cell: (row) => <span className="text-muted-foreground">{formatDate(row.created_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12 text-right',
      cell: (row) => (
        <RowActions lead={row} isAdmin={isAdmin} onDelete={() => setDeleteTarget(row)} />
      ),
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 py-16 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load leads.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">Manage your lead pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((p) => !p)}
            className="gap-2"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {(stageFilter || sourceFilter) && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5">
                {[stageFilter, sourceFilter].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            aria-label="Refresh leads"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-md border bg-muted/30">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <span className="text-xs font-medium text-muted-foreground">Stage</span>
            <Select value={stageFilter || ALL} onValueChange={handleStageChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All stages</SelectItem>
                {Object.values(LeadStage).map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <span className="text-xs font-medium text-muted-foreground">Source</span>
            <Select value={sourceFilter || ALL} onValueChange={handleSourceChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All sources</SelectItem>
                {Object.values(LeadSource).map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(stageFilter || sourceFilter) && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setStageFilter('');
                  setSourceFilter('');
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      )}

      <DataTable
        data={items}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={search ? `No leads match "${search}".` : 'No leads yet.'}
        pagination={pagination && pagination.total_pages > 1 ? pagination : undefined}
        onPageChange={setPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        searchValue={search}
        searchPlaceholder="Search by name, phone, or email…"
        onSearchChange={handleSearchChange}
        actions={
          !isLoading && pagination ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users2 className="h-3.5 w-3.5" />
              <span>{pagination.total} total</span>
            </div>
          ) : undefined
        }
        rowKey={(row) => row.id}
      />

      <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} />

      {isAdmin && (
        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(o) => {
            if (!o) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Delete Lead
              </AlertDialogTitle>
              <AlertDialogDescription>
                Delete <strong>{deleteTarget?.full_name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!deleteTarget) return;
                  deleteLead(deleteTarget.id, {
                    onSuccess: () => {
                      toast({
                        title: 'Lead deleted',
                        description: `${deleteTarget.full_name} has been removed.`,
                      });
                      setDeleteTarget(null);
                    },
                  });
                }}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
