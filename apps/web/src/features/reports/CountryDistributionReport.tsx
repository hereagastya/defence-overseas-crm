import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCountryDistributionReport } from './api';
import { ChartCard, HorizontalBarChart, ReportError } from './charts';
import { exportToCsv } from './utils';

export function CountryDistributionReport() {
  const { data, isLoading, isError } = useCountryDistributionReport();

  function handleExport() {
    if (!data) return;
    exportToCsv('country-distribution.csv', [
      ...data.leads_by_country.map((d) => ({
        group: 'Lead Country',
        country: d.label,
        count: d.value,
      })),
      ...data.students_by_country.map((d) => ({
        group: 'Student Country',
        country: d.label,
        count: d.value,
      })),
      ...data.leads_by_nationality.map((d) => ({
        group: 'Lead Nationality',
        country: d.label,
        count: d.value,
      })),
    ]);
  }

  if (isError) return <ReportError message="Failed to load country distribution report." />;

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

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Leads by Country" isLoading={isLoading}>
          <HorizontalBarChart data={data?.leads_by_country ?? []} emptyMessage="No country data" />
        </ChartCard>

        <ChartCard title="Students by Country" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.students_by_country ?? []}
            emptyMessage="No country data"
          />
        </ChartCard>

        <ChartCard title="Leads by Nationality" isLoading={isLoading}>
          <HorizontalBarChart
            data={data?.leads_by_nationality ?? []}
            emptyMessage="No nationality data"
          />
        </ChartCard>
      </div>
    </div>
  );
}
