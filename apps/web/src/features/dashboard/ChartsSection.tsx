import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardCharts, ChartDataPoint } from './api';

// ── Colour palette (uses CSS vars at runtime via string) ─────────────────────

const STAGE_COLORS = [
  'hsl(142 76% 36%)',
  'hsl(142 60% 50%)',
  'hsl(142 45% 62%)',
  'hsl(142 35% 74%)',
  'hsl(142 25% 84%)',
  'hsl(142 20% 88%)',
  'hsl(142 15% 92%)',
  'hsl(142 10% 94%)',
];

const SOURCE_COLOR = 'hsl(142 76% 36%)';

// ── Custom tooltip ────────────────────────────────────────────────────────────

function AreaTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-primary font-bold text-sm">₹{payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-0.5 capitalize">{label?.replace(/_/g, ' ')}</p>
      <p className="text-primary font-bold">{payload[0].value}</p>
    </div>
  );
}

// ── Revenue area chart ────────────────────────────────────────────────────────

function RevenueAreaChart({ data }: { data: Array<{ month: string; amount: number }> }) {
  const formatted = data.map((d) => ({
    month: d.month.slice(5), // "MM"
    amount: d.amount,
  }));

  if (formatted.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No revenue data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(135 21% 89%)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'hsl(150 11% 40%)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(150 11% 40%)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<AreaTooltip />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="hsl(142 76% 36%)"
          strokeWidth={2.5}
          fill="url(#revenueGradient)"
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0, fill: 'hsl(142 76% 36%)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────────

const RADIAN = Math.PI / 180;

function DonutLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent) return null;
  if ((percent as number) < 0.06) return null;
  const ir = innerRadius as number;
  const or = outerRadius as number;
  const radius = ir + (or - ir) * 0.5;
  const x = (cx as number) + radius * Math.cos(-(midAngle as number) * RADIAN);
  const y = (cy as number) + radius * Math.sin(-(midAngle as number) * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={700}
    >
      {`${((percent as number) * 100).toFixed(0)}%`}
    </text>
  );
}

function StageDonut({ data }: { data: ChartDataPoint[] }) {
  const top = data.slice(0, 8);
  const total = top.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={top}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={82}
            dataKey="value"
            labelLine={false}
            label={DonutLabel}
            strokeWidth={0}
          >
            {top.map((_, i) => (
              <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: '1px solid hsl(135 21% 89%)',
              background: 'hsl(0 0% 100%)',
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 px-1">
        {top.slice(0, 5).map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }}
            />
            <span className="flex-1 truncate capitalize text-muted-foreground">
              {d.label.replace(/_/g, ' ')}
            </span>
            <span className="font-semibold text-foreground">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal bar chart (source / stage) ─────────────────────────────────────

function SourceBarChart({ data }: { data: ChartDataPoint[] }) {
  const formatted = data.slice(0, 6).map((d) => ({
    name: d.label.replace(/_/g, ' '),
    value: d.value,
  }));

  if (formatted.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
        barSize={10}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(135 21% 89%)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: 'hsl(150 11% 40%)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="name"
          type="category"
          width={88}
          tick={{ fontSize: 11, fill: 'hsl(150 11% 40%)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<BarTooltip />} />
        <Bar dataKey="value" fill={SOURCE_COLOR} radius={[0, 5, 5, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function AreaSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-[200px] w-full rounded-xl" />
    </div>
  );
}

function DonutSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton className="h-[180px] w-[180px] rounded-full" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  data?: DashboardCharts;
  isLoading: boolean;
}

export function ChartsSection({ data, isLoading }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Row 1: Area chart + Leads by stage donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold">Monthly Revenue Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Last 12 months</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <AreaSkeleton /> : <RevenueAreaChart data={data?.monthly_revenue ?? []} />}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold">Leads by Stage</CardTitle>
            <p className="text-xs text-muted-foreground">Current distribution</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <DonutSkeleton /> : <StageDonut data={data?.leads_by_stage ?? []} />}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Source bar chart + Students by stage donut */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold">Leads by Source</CardTitle>
            <p className="text-xs text-muted-foreground">Where your leads come from</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2.5 flex-1" />
                    <Skeleton className="h-3 w-5" />
                  </div>
                ))}
              </div>
            ) : (
              <SourceBarChart data={data?.leads_by_source ?? []} />
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] font-bold">Students by Stage</CardTitle>
            <p className="text-xs text-muted-foreground">Current enrollment stages</p>
          </CardHeader>
          <CardContent>
            {isLoading ? <DonutSkeleton /> : <StageDonut data={data?.students_by_stage ?? []} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
