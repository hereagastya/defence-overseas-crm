import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, MoreHorizontal, Plus, RefreshCw, Users2, XCircle } from 'lucide-react';
import { UserRole, StudentStage, STUDENT_STAGE_LABELS, STUDENT_STAGE_ORDER } from '@doc/shared';
import type { StudentWithCounselor, StudentFiltersInput } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { DataTable } from '@/components/DataTable';
import type { ColumnDef } from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStudents } from './api';

const PAGE_SIZE = 25;
const ALL = '__all__';

type SortableKey = 'created_at' | 'updated_at' | 'full_name' | 'student_stage' | 'lead_score';

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function StageBadge({ stage }: { stage: StudentStage }) {
  const isClosed = stage === StudentStage.CASE_CLOSED;
  return (
    <Badge
      variant={isClosed ? 'destructive' : 'secondary'}
      className="text-[10px] whitespace-nowrap"
    >
      {STUDENT_STAGE_LABELS[stage] ?? stage}
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

function RowActions({ student }: { student: StudentWithCounselor }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/students/${student.id}`}>View</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StudentListPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortableKey>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [stageFilter, setStageFilter] = useState<StudentStage | ''>('');
  const [countryFilter, setCountryFilter] = useState('');
  const [isCaseClosed, setIsCaseClosed] = useState<boolean | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo<StudentFiltersInput>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
      stage: stageFilter || undefined,
      country: countryFilter || undefined,
      is_case_closed: isCaseClosed,
    }),
    [page, search, sortBy, sortOrder, stageFilter, countryFilter, isCaseClosed],
  );

  const { data, isLoading, isError, refetch } = useStudents(filters);

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const activeFilterCount = [stageFilter, countryFilter, isCaseClosed !== undefined].filter(
    Boolean,
  ).length;

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
    setStageFilter(value === ALL ? '' : (value as StudentStage));
    setPage(1);
  }

  function handleCaseClosedChange(value: string) {
    if (value === ALL) setIsCaseClosed(undefined);
    else if (value === 'true') setIsCaseClosed(true);
    else setIsCaseClosed(false);
    setPage(1);
  }

  function handleClearFilters() {
    setStageFilter('');
    setCountryFilter('');
    setIsCaseClosed(undefined);
    setPage(1);
  }

  const columns: ColumnDef<StudentWithCounselor>[] = [
    {
      id: 'full_name',
      header: 'Name',
      sortable: true,
      cell: (row) => (
        <Link to={`/students/${row.id}`} className="font-medium hover:underline">
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
      id: 'student_stage',
      header: 'Stage',
      sortable: true,
      cell: (row) => <StageBadge stage={row.student_stage} />,
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
      id: 'case_closed',
      header: 'Status',
      cell: (row) =>
        row.case_closed_at ? (
          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/40">
            <XCircle className="mr-1 h-3 w-3" />
            Closed
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-green-600 border-green-500/40">
            Active
          </Badge>
        ),
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
      cell: (row) => <RowActions student={row} />,
    },
  ];

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Students</h1>
        <div className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 py-16 text-center">
          <p className="text-sm font-medium text-destructive">Failed to load students.</p>
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
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">Manage your student journey</p>
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
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            aria-label="Refresh students"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button asChild className="gap-2">
              <Link to="/leads">
                <Plus className="h-4 w-4" />
                Add via Lead
              </Link>
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-4 rounded-md border bg-muted/30">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <span className="text-xs font-medium text-muted-foreground">Stage</span>
            <Select value={stageFilter || ALL} onValueChange={handleStageChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All stages</SelectItem>
                {STUDENT_STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STUDENT_STAGE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <span className="text-xs font-medium text-muted-foreground">Case</span>
            <Select
              value={isCaseClosed === undefined ? ALL : String(isCaseClosed)}
              onValueChange={handleCaseClosedChange}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                <SelectItem value="false">Active</SelectItem>
                <SelectItem value="true">Case Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[140px]">
            <Label className="text-xs font-medium text-muted-foreground">Country</Label>
            <Input
              placeholder="e.g. Canada"
              value={countryFilter}
              onChange={(e) => {
                setCountryFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs"
            />
          </div>

          {activeFilterCount > 0 && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleClearFilters}
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
        emptyMessage={search ? `No students match "${search}".` : 'No students yet.'}
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
    </div>
  );
}
