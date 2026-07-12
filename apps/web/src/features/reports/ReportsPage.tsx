import { useState } from 'react';
import { CalendarDays, RefreshCw, X } from 'lucide-react';
import { UserRole } from '@doc/shared';
import { useAuthStore } from '@/store/useAuthStore';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { ReportFilters } from './api';
import { LeadsReport } from './LeadsReport';
import { RevenueReport } from './RevenueReport';
import { CounselorPerformanceReport } from './CounselorPerformanceReport';
import { StudentProgressReport } from './StudentProgressReport';
import { ApplicationsReport } from './ApplicationsReport';
import { CountryDistributionReport } from './CountryDistributionReport';
import { TasksReport } from './TasksReport';
import { FollowUpsReport } from './FollowUpsReport';

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const queryClient = useQueryClient();

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filters: ReportFilters = {
    from: from || undefined,
    to: to || undefined,
  };

  const hasFilter = Boolean(from || to);

  function clearFilters() {
    setFrom('');
    setTo('');
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Analyse performance across your CRM</p>
        </div>
        <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-4">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          Date range
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              From
            </label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 text-xs w-36"
              max={to || undefined}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              To
            </label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 text-xs w-36"
              min={from || undefined}
            />
          </div>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 h-8 gap-1 text-xs"
              onClick={clearFilters}
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
        {hasFilter && (
          <p className="w-full text-[11px] text-muted-foreground mt-0.5">
            Showing data{from ? ` from ${from}` : ''}
            {to ? ` to ${to}` : ''}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leads">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          {isAdmin && <TabsTrigger value="counselors">Counselors</TabsTrigger>}
        </TabsList>

        <TabsContent value="leads" className="mt-6">
          <LeadsReport filters={filters} />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <RevenueReport filters={filters} />
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <StudentProgressReport filters={filters} />
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <ApplicationsReport filters={filters} />
        </TabsContent>

        <TabsContent value="countries" className="mt-6">
          <CountryDistributionReport />
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <TasksReport filters={filters} />
        </TabsContent>

        <TabsContent value="followups" className="mt-6">
          <FollowUpsReport filters={filters} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="counselors" className="mt-6">
            <CounselorPerformanceReport />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
