import { Download } from 'lucide-react';
import { PAYMENT_CATEGORY_LABELS } from '@doc/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRevenueReport } from './api';
import type { ReportFilters } from './api';
import { StatCard, MonthlyBarChart, ReportError } from './charts';
import { exportToCsv } from './utils';

interface Props {
  filters: ReportFilters;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function RevenueReport({ filters }: Props) {
  const { data, isLoading, isError } = useRevenueReport(filters);

  function handleExport() {
    if (!data) return;
    exportToCsv('revenue-report.csv', [
      { metric: 'Total Revenue Collected', value: data.total_revenue },
      { metric: 'Total Agreed', value: data.total_agreed },
      { metric: 'Total Outstanding', value: data.total_outstanding },
      ...data.by_category.map((c) => ({
        metric: `Category: ${PAYMENT_CATEGORY_LABELS[c.category as keyof typeof PAYMENT_CATEGORY_LABELS] ?? c.category}`,
        agreed: c.total_agreed,
        collected: c.total_collected,
      })),
    ]);
  }

  if (isError) return <ReportError message="Failed to load revenue report." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={!data}
          className="gap-2"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-6">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-7 w-32" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Collected"
              value={formatCurrency(data?.total_revenue ?? 0)}
              accent="success"
            />
            <StatCard title="Total Agreed" value={formatCurrency(data?.total_agreed ?? 0)} />
            <StatCard
              title="Outstanding"
              value={formatCurrency(data?.total_outstanding ?? 0)}
              accent={(data?.total_outstanding ?? 0) > 0 ? 'warning' : 'default'}
            />
          </>
        )}
      </div>

      {/* Monthly chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monthly Revenue (12 months)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <MonthlyBarChart data={data?.monthly ?? []} formatValue={formatCurrency} />
          )}
        </CardContent>
      </Card>

      {/* By category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (data?.by_category ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No category data</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Category</th>
                    <th className="pb-2 pr-4 font-medium text-right">Agreed</th>
                    <th className="pb-2 pr-4 font-medium text-right">Collected</th>
                    <th className="pb-2 font-medium text-right">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.by_category ?? []).map((row) => (
                    <tr key={row.category} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium capitalize">
                        {PAYMENT_CATEGORY_LABELS[
                          row.category as keyof typeof PAYMENT_CATEGORY_LABELS
                        ] ?? row.category.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 pr-4 text-right text-muted-foreground">
                        {formatCurrency(row.total_agreed)}
                      </td>
                      <td className="py-2 pr-4 text-right text-green-600 dark:text-green-400">
                        {formatCurrency(row.total_collected)}
                      </td>
                      <td className="py-2 text-right text-orange-600 dark:text-orange-400">
                        {formatCurrency(row.total_agreed - row.total_collected)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
