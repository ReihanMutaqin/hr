import React from "react";
import { Link } from "react-router";
import {
  Users,
  Briefcase,
  CalendarDays,
  CalendarCheck,
  Wallet,
  Building2,
  ArrowRight,
  Activity,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  UserPlus,
  ShieldCheck
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
  ResponsiveContainer
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
  total: { label: "Jumlah Karyawan", color: "#2563eb" },
};

const payrollChartConfig: ChartConfig = {
  totalNet: { label: "Total Gaji Bersih", color: "#10b981" },
};

const CANDIDATE_COLORS: Record<string, string> = {
  new: "#2563eb",
  screening: "#f59e0b",
  interview: "#0284c7",
  offer: "#06b6d4",
  hired: "#10b981",
  rejected: "#ef4444",
};

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  accentBg,
  accentText,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  accentBg: string;
  accentText: string;
}) {
  return (
    <Card className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{value}</p>
            {hint && <p className="text-xs text-slate-500 font-medium">{hint}</p>}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${accentBg} ${accentText} shrink-0`}>
            <Icon className="h-5.5 w-5.5" />
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
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const c = data.counts;
  const payrollData = (data.payrollByPeriod || []).slice().reverse().map((p) => ({
    period: p.period,
    totalNet: Number(p.totalNet ?? 0),
  }));
  
  const candData = (data.candidatesByStatus || []).map((s) => ({
    name: statusLabel(s.status),
    value: s.total,
    fill: CANDIDATE_COLORS[s.status] ?? "#64748b",
  }));

  const todayFormatted = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 pb-8">
      
      {/* Welcome Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Selamat datang kembali, {user?.fullName} 👋
            </h1>
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-semibold text-xs capitalize">
              {user?.role === "admin" ? "Super Admin" : user?.role === "hr" ? "HR Manager" : "Karyawan"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">
            Ringkasan operasional HR & manajemen talenta • <span className="font-medium text-slate-700">{todayFormatted}</span>
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          {isManager && (
            <>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs" asChild>
                <Link to="/recruitment">
                  <Plus className="w-4 h-4 mr-1.5" /> Buat Lowongan
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 rounded-xl" asChild>
                <Link to="/employees">
                  <UserPlus className="w-4 h-4 mr-1.5 text-blue-600" /> Karyawan
                </Link>
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 rounded-xl" asChild>
            <Link to="/attendance">
              <Clock className="w-4 h-4 mr-1.5 text-emerald-600" /> Absensi
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 rounded-xl" asChild>
            <Link to="/leave">
              <CalendarDays className="w-4 h-4 mr-1.5 text-amber-600" /> Cuti
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Karyawan Aktif"
          value={formatNumber(c.employees)}
          icon={Users}
          hint={`${c.departments} Departemen terdaftar`}
          accentBg="bg-blue-50"
          accentText="text-blue-600"
        />
        <StatCard
          title="Lowongan Terbuka"
          value={formatNumber(c.openJobs)}
          icon={Briefcase}
          hint={`${c.candidates} Pelamar terdaftar`}
          accentBg="bg-slate-100"
          accentText="text-slate-700"
        />
        <StatCard
          title="Hadir Hari Ini"
          value={formatNumber(c.presentToday)}
          icon={CalendarCheck}
          hint={`dari total ${c.employees} karyawan`}
          accentBg="bg-emerald-50"
          accentText="text-emerald-600"
        />
        <StatCard
          title="Cuti Menunggu"
          value={formatNumber(c.pendingLeave)}
          icon={CalendarDays}
          hint="Perlu konfirmasi HR"
          accentBg="bg-amber-50"
          accentText="text-amber-600"
        />
      </div>

      {/* Main Charts Grid: 2 Columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Department Distribution Bar Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Building2 className="h-4.5 w-4.5 text-blue-600" />
              Distribusi Karyawan per Departemen
            </CardTitle>
            <CardDescription className="text-xs">
              Jumlah tenaga kerja aktif di tiap unit kerja perusahaan
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer config={deptChartConfig} className="h-[280px] w-full">
              <BarChart data={data.byDept} margin={{ left: -15, right: 10, top: 10, bottom: 25 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-15} textAnchor="end" height={55} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={36} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Candidate Funnel Donut Chart */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Briefcase className="h-4.5 w-4.5 text-blue-600" />
              Funnel Status Pelamar
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi tahap rekrutmen kandidat
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {candData.length > 0 ? (
              <div className="space-y-4">
                <ChartContainer config={{}} className="mx-auto h-[200px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={candData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {candData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  {candData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                      <span className="text-slate-600 truncate">{d.name}</span>
                      <span className="font-bold text-slate-800 ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-16 text-center text-xs text-slate-400 font-medium">Belum ada data pelamar</p>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Payroll Trend & Recruitment Activity Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Payroll Trend Line Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Wallet className="h-4.5 w-4.5 text-emerald-600" />
                Tren Pengeluaran Payroll
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Total gaji bersih (Net) per periode • Periode Terakhir: <strong className="text-slate-900">{formatRupiah(data.payrollMonthTotal)}</strong>
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700" asChild>
              <Link to="/payroll">
                Kelola Payroll <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {payrollData.length > 0 ? (
              <ChartContainer config={payrollChartConfig} className="h-[240px] w-full">
                <LineChart data={payrollData} margin={{ left: 5, right: 15, top: 10, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
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
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#ffffff" }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="py-16 text-center text-xs text-slate-400 font-medium">Belum ada riwayat penggajian</p>
            )}
          </CardContent>
        </Card>

        {/* Recruitment Evaluation Activity */}
        {isManager && (
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Activity className="h-4.5 w-4.5 text-blue-600" />
                Aktivitas Evaluasi Rekrutmen
              </CardTitle>
              <CardDescription className="text-xs">Riwayat pemeringkatan kualifikasi berkas</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {(aiLogs ?? []).slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-slate-800 uppercase tracking-wider text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                          {log.feature}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDateTime(log.createdAt)}</span>
                      </div>
                      <p className="truncate text-slate-600 font-medium mt-1">
                        {log.docCount} Dokumen Diproses • {log.fallback ? "Analisis Keyword" : "Match Evaluator"}
                      </p>
                    </div>
                  </div>
                ))}
                {(aiLogs ?? []).length === 0 && (
                  <p className="py-12 text-center text-xs text-slate-400 font-medium">
                    Belum ada aktivitas evaluasi berkas.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Recent Candidates & Leave Requests Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Recent Candidates */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Pelamar Terbaru</CardTitle>
              <CardDescription className="text-xs">Kandidat yang baru mendaftar</CardDescription>
            </div>
            {isManager && (
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700" asChild>
                <Link to="/recruitment">
                  Lihat semua <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {data.recentCandidates.map((cand) => (
                <div key={cand.id} className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800 text-sm">{cand.fullName}</p>
                    <p className="truncate text-slate-500 mt-0.5">{cand.jobTitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {cand.aiScore && (
                      <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-semibold text-xs">
                        Match {Number(cand.aiScore).toFixed(0)}%
                      </Badge>
                    )}
                    <Badge variant={statusVariant(cand.status)} className="capitalize text-xs">
                      {statusLabel(cand.status)}
                    </Badge>
                  </div>
                </div>
              ))}
              {data.recentCandidates.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-400 font-medium">Belum ada pelamar baru</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Leave Requests */}
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-slate-100">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Pengajuan Cuti Terbaru</CardTitle>
              <CardDescription className="text-xs">Permohonan izin & cuti karyawan</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700" asChild>
              <Link to="/leave">
                Lihat semua <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {data.recentLeaves.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white transition-colors">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800 text-sm">{l.employeeName}</p>
                    <p className="truncate text-slate-500 mt-0.5">
                      {statusLabel(l.type)} • {formatDate(l.startDate)} s/d {formatDate(l.endDate)} ({l.days} hari)
                    </p>
                  </div>
                  <Badge variant={statusVariant(l.status)} className="capitalize text-xs">
                    {statusLabel(l.status)}
                  </Badge>
                </div>
              ))}
              {data.recentLeaves.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-400 font-medium">Belum ada pengajuan cuti</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

    </div>
  );
}
