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
  Cell,
  Pie,
  PieChart,
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
    <Card className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow min-w-0 overflow-hidden">
      <CardContent className="p-4 sm:p-5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate min-w-0">{title}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate">{value}</p>
            {hint && <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">{hint}</p>}
          </div>
          <div className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl ${accentBg} ${accentText} shrink-0`}>
            <Icon className="h-5 w-5 sm:h-5.5 sm:w-5.5" />
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

  if (isLoading || !data) {
    return (
      <div className="space-y-6 w-full min-w-0 overflow-x-hidden">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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
    <div className="space-y-6 pb-8 w-full min-w-0 overflow-x-hidden">
      
      {/* Welcome Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full min-w-0 overflow-hidden">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Selamat datang kembali, {user?.fullName} 👋
            </h1>
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-semibold text-xs capitalize">
              {user?.role === "admin" ? "Super Admin" : user?.role === "hr" ? "HR Manager" : "Karyawan"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Ringkasan operasional HR & manajemen talenta • <span className="font-medium text-slate-700">{todayFormatted}</span>
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="grid grid-cols-2 sm:flex flex-wrap items-center gap-2 w-full md:w-auto">
          {isManager && (
            <>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs h-10 text-xs" asChild>
                <Link to="/recruitment">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Lowongan
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 rounded-xl h-10 text-xs" asChild>
                <Link to="/employees">
                  <UserPlus className="w-3.5 h-3.5 mr-1 text-blue-600" /> Karyawan
                </Link>
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 rounded-xl h-10 text-xs" asChild>
            <Link to="/attendance">
              <Clock className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Absensi
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="border-slate-200 text-slate-700 rounded-xl h-10 text-xs" asChild>
            <Link to="/leave">
              <CalendarDays className="w-3.5 h-3.5 mr-1 text-amber-600" /> Cuti
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 w-full min-w-0">
        <StatCard
          title="Karyawan Aktif"
          value={formatNumber(c.employees)}
          icon={Users}
          hint={`${c.departments} Departemen`}
          accentBg="bg-blue-50"
          accentText="text-blue-600"
        />
        <StatCard
          title="Lowongan Terbuka"
          value={formatNumber(c.openJobs)}
          icon={Briefcase}
          hint={`${c.candidates} Pelamar`}
          accentBg="bg-slate-100"
          accentText="text-slate-700"
        />
        <StatCard
          title="Hadir Hari Ini"
          value={formatNumber(c.presentToday)}
          icon={CalendarCheck}
          hint={`dari ${c.employees} karyawan`}
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
      <div className="grid gap-4 lg:grid-cols-3 w-full min-w-0">
        
        {/* Department Distribution Bar Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
              <Building2 className="h-4.5 w-4.5 text-blue-600 shrink-0" />
              Distribusi Karyawan per Departemen
            </CardTitle>
            <CardDescription className="text-xs">
              Jumlah tenaga kerja aktif di tiap unit kerja perusahaan
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 overflow-x-auto min-w-0">
            <ChartContainer config={deptChartConfig} className="h-[280px] w-full min-w-[300px]">
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
        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-900">
              <Briefcase className="h-4.5 w-4.5 text-blue-600 shrink-0" />
              Funnel Status Pelamar
            </CardTitle>
            <CardDescription className="text-xs">
              Distribusi tahap rekrutmen kandidat
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 min-w-0">
            {candData.length > 0 ? (
              <div className="space-y-4 min-w-0">
                <ChartContainer config={{}} className="mx-auto h-[200px] w-full min-w-0">
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
                    <div key={d.name} className="flex items-center gap-2 text-xs min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                      <span className="text-slate-600 truncate">{d.name}</span>
                      <span className="font-bold text-slate-900 ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-12 italic">Belum ada data kandidat</p>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
