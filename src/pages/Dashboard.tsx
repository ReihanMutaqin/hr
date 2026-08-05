import { Link } from "react-router";
import {
  Users,
  Briefcase,
  CalendarDays,
  CalendarCheck,
  Wallet,
  Building2,
  Sparkles,
  ArrowRight,
  Activity,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import {
  formatRupiah,
  formatNumber,
  formatDate,
  formatDateTime,
  statusLabel,
  statusVariant,
} from "@/lib/format";

const deptChartConfig: ChartConfig = {
  total: { label: "Karyawan", color: "hsl(239 84% 67%)" },
};

const payrollChartConfig: ChartConfig = {
  totalNet: { label: "Total Gaji Bersih", color: "hsl(142 71% 45%)" },
};

const CANDIDATE_COLORS: Record<string, string> = {
  new: "#6366f1",
  screening: "#f59e0b",
  interview: "#8b5cf6",
  offer: "#06b6d4",
  hired: "#22c55e",
  rejected: "#ef4444",
};

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  accent: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "hr";
  const { data, isLoading } = trpc.misc.dashboard.useQuery();
  const { data: aiLogs } = trpc.misc.aiLogs.useQuery(undefined, { enabled: isManager });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const c = data.counts;
  const payrollData = data.payrollByPeriod.map((p) => ({
    period: p.period,
    totalNet: Number(p.totalNet ?? 0),
  }));
  const candData = data.candidatesByStatus.map((s) => ({
    name: statusLabel(s.status),
    value: s.total,
    fill: CANDIDATE_COLORS[s.status] ?? "#94a3b8",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Selamat datang kembali, {user?.fullName}. Ringkasan HR hari ini.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Karyawan Aktif"
          value={formatNumber(c.employees)}
          icon={Users}
          hint={`${c.departments} departemen`}
          accent="bg-indigo-100 text-indigo-600"
        />
        <StatCard
          title="Lowongan Dibuka"
          value={formatNumber(c.openJobs)}
          icon={Briefcase}
          hint={`${c.candidates} total kandidat`}
          accent="bg-violet-100 text-violet-600"
        />
        <StatCard
          title="Hadir Hari Ini"
          value={formatNumber(c.presentToday)}
          icon={CalendarCheck}
          hint={`dari ${c.employees} karyawan`}
          accent="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Cuti Menunggu"
          value={formatNumber(c.pendingLeave)}
          icon={CalendarDays}
          hint="perlu persetujuan"
          accent="bg-amber-100 text-amber-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-indigo-500" />
              Karyawan per Departemen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={deptChartConfig} className="h-[280px] w-full">
              <BarChart data={data.byDept} margin={{ left: 0, right: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-violet-500" />
              Funnel Kandidat
            </CardTitle>
            <CardDescription>Distribusi status kandidat</CardDescription>
          </CardHeader>
          <CardContent>
            {candData.length > 0 ? (
              <ChartContainer config={{}} className="mx-auto h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={candData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {candData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Belum ada kandidat</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {candData.map((d) => (
                <span key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-emerald-500" />
              Tren Payroll
            </CardTitle>
            <CardDescription>
              Total gaji bersih per periode · Periode terakhir: {formatRupiah(data.payrollMonthTotal)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payrollData.length > 0 ? (
              <ChartContainer config={payrollChartConfig} className="h-[240px] w-full">
                <LineChart data={payrollData} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(v: number) => `${Math.round(v / 1_000_000)}jt`}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v) => formatRupiah(Number(v))} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalNet"
                    stroke="var(--color-totalNet)"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">Belum ada data payroll</p>
            )}
          </CardContent>
        </Card>

        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                Aktivitas Evaluasi Rekrutmen
              </CardTitle>
              <CardDescription>Riwayat pemeringkatan terakhir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(aiLogs ?? []).slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 text-sm">
                    <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {log.feature}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{log.docCount} dok</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {log.fallback ? "Standard Keyword" : "Smart Rerank"} · {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {(aiLogs ?? []).length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada aktivitas evaluasi. Coba fitur evaluasi di menu Rekrutmen & Talent.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Kandidat Terbaru</CardTitle>
            {isManager && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/recruitment">
                  Lihat semua <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentCandidates.map((cand) => (
                <div key={cand.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{cand.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{cand.jobTitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {cand.aiScore && (
                      <Badge variant="outline" className="border-indigo-200 text-indigo-600">
                        AI {Number(cand.aiScore).toFixed(0)}
                      </Badge>
                    )}
                    <Badge variant={statusVariant(cand.status)}>{statusLabel(cand.status)}</Badge>
                  </div>
                </div>
              ))}
              {data.recentCandidates.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Belum ada kandidat</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Pengajuan Cuti Terbaru</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/leave">
                Lihat semua <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentLeaves.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{l.employeeName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {statusLabel(l.type)} · {formatDate(l.startDate)} – {formatDate(l.endDate)} ({l.days} hari)
                    </p>
                  </div>
                  <Badge variant={statusVariant(l.status)}>{statusLabel(l.status)}</Badge>
                </div>
              ))}
              {data.recentLeaves.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Belum ada pengajuan cuti</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
