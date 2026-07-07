import type * as React from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Search } from 'lucide-react';
import type { Pagination } from '@doc/shared';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (id: string, order: 'asc' | 'desc') => void;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
  rowKey?: (row: T, index: number) => string;
}

const SKELETON_ROWS = 5;

function SortIcon({
  id,
  sortBy,
  sortOrder,
}: {
  id: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  if (sortBy !== id) return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
  return sortOrder === 'asc' ? (
    <ChevronUp className="ml-1 h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="ml-1 h-3.5 w-3.5" />
  );
}

export function DataTable<T>({
  data,
  columns,
  isLoading = false,
  emptyMessage = 'No results found.',
  pagination,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  searchValue,
  searchPlaceholder = 'Search…',
  onSearchChange,
  actions,
  rowKey,
}: DataTableProps<T>) {
  const handleSortClick = (col: ColumnDef<T>) => {
    if (!col.sortable || !onSortChange) return;
    const nextOrder = sortBy === col.id && sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange(col.id, nextOrder);
  };

  const renderCellValue = (row: T, col: ColumnDef<T>): React.ReactNode => {
    if (col.cell) return col.cell(row);
    if (col.accessorKey) {
      const val = row[col.accessorKey];
      return val == null ? '—' : String(val);
    }
    return '—';
  };

  const showToolbar = onSearchChange !== undefined || actions !== undefined;

  return (
    <div className="space-y-3">
      {showToolbar && (
        <div className="flex items-center justify-between gap-3">
          {onSearchChange !== undefined && (
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={searchPlaceholder}
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={cn(col.headerClassName, col.sortable && 'cursor-pointer select-none')}
                  onClick={() => handleSortClick(col)}
                >
                  <span className="inline-flex items-center">
                    {col.header}
                    {col.sortable && onSortChange && (
                      <SortIcon id={col.id} sortBy={sortBy} sortOrder={sortOrder} />
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, i) => (
                <TableRow key={rowKey ? rowKey(row, i) : i}>
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.className}>
                      {renderCellValue(row, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.total_pages} &mdash; {pagination.total} total
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => onPageChange?.(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.total_pages || isLoading}
              onClick={() => onPageChange?.(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
