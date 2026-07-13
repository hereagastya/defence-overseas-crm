import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCounselorPerformanceReport } from './api';
import { ReportError } from './charts';
import { exportToCsv } from './utils';
import { formatCurrency } from '@/lib/format';

export function CounselorPerformanceReport() {
  const { data, isLoading, isError } = useCounselorPerformanceReport();

  function handleExport() {
    if (!data) return;
    exportToCsv(
      'counselor-performance.csv',
      data.counselors.map((c) => ({
        counselor: c.counselor_name,
        leads_assigned: c.leads_assigned,
        conversions: c.conversions,
        students_managed: c.students_managed,
        tasks_completed: c.tasks_completed,
        followups_completed: c.followups_completed,
        revenue_collected: c.revenue_collected,
      })),
    );
  }

  if (isError) return <ReportError message="Failed to load counselor performance report." />;

  return (
    <div className="space-y-4">
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

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (data?.counselors ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No counselors found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="p-4 font-medium">Counselor</th>
                    <th className="p-4 font-medium text-right">Leads</th>
                    <th className="p-4 font-medium text-right">Conversions</th>
                    <th className="p-4 font-medium text-right">Rate</th>
                    <th className="p-4 font-medium text-right">Students</th>
                    <th className="p-4 font-medium text-right">Tasks Done</th>
                    <th className="p-4 font-medium text-right">Follow-ups Done</th>
                    <th className="p-4 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.counselors ?? []).map((c) => {
                    const rate =
                      c.leads_assigned > 0
                        ? Math.round((c.conversions / c.leads_assigned) * 100)
                        : 0;
                    return (
                      <tr key={c.counselor_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-4 font-medium">{c.counselor_name}</td>
                        <td className="p-4 text-right text-muted-foreground">{c.leads_assigned}</td>
                        <td className="p-4 text-right text-green-600 dark:text-green-400">
                          {c.conversions}
                        </td>
                        <td className="p-4 text-right">
                          <span
                            className={
                              rate >= 50
                                ? 'text-green-600 dark:text-green-400'
                                : rate >= 20
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-muted-foreground'
                            }
                          >
                            {rate}%
                          </span>
                        </td>
                        <td className="p-4 text-right text-muted-foreground">
                          {c.students_managed}
                        </td>
                        <td className="p-4 text-right text-muted-foreground">
                          {c.tasks_completed}
                        </td>
                        <td className="p-4 text-right text-muted-foreground">
                          {c.followups_completed}
                        </td>
                        <td className="p-4 text-right text-muted-foreground">
                          {formatCurrency(c.revenue_collected)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
