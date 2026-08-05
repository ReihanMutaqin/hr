import { useState } from "react";
import { Wallet, Play, CheckCheck, Receipt, Banknote, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah, formatDateTime, statusLabel, statusVariant } from "@/lib/format";

export default function Payroll() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "hr";
  const utils = trpc.useUtils();
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(currentPeriod);
  const [filterPeriod, setFilterPeriod] = useState("all");

  const { data: slips, isLoading } = trpc.payroll.list.useQuery(
    filterPeriod !== "all" ? { period: filterPeriod } : undefined,
  );
  const { data: periods } = trpc.payroll.periods.useQuery();
  const { data: summary } = trpc.payroll.summary.useQuery(
    filterPeriod !== "all" ? { period: filterPeriod } : undefined,
  );

  const invalidate = () => {
    utils.payroll.list.invalidate();
    utils.payroll.periods.invalidate();
    utils.payroll.summary.invalidate();
  };

  const generate = trpc.payroll.generate.useMutation({
    onSuccess: (r) => {
      toast.success(`Payroll dibuat: ${r.created} slip baru dari ${r.total} karyawan`);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const markPaid = trpc.payroll.markPaid.useMutation({
    onSuccess: () => { toast.success("Ditandai dibayar"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const markAllPaid = trpc.payroll.markAllPaid.useMutation({
    onSuccess: () => { toast.success("Semua slip periode ini dibayar"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 w-full min-w-0 overflow-x-hidden">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs w-full min-w-0 overflow-hidden">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">Penggajian (Payroll)</h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Penggajian otomatis berbasis absensi (potongan proporsional, tunjangan 10%, PPh21 5%)
          </p>
        </div>

        {isManager && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full sm:w-auto shrink-0">
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label className="text-xs">Periode</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full sm:w-[170px] rounded-xl text-xs" />
            </div>
            <Button 
              onClick={() => generate.mutate({ period })} 
              disabled={generate.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 sm:h-10 text-xs shadow-md"
            >
              <Play className="mr-2 h-4 w-4" />
              {generate.isPending ? "Memproses..." : "Generate Payroll"}
            </Button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 w-full min-w-0">
        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Total Gaji Bersih</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 truncate">{formatRupiah(Number(summary?.totals.totalNet ?? 0))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Total Pajak (PPh21)</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 truncate">{formatRupiah(Number(summary?.totals.totalTax ?? 0))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Jumlah Slip</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{summary?.totals.count ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs w-full min-w-0 overflow-hidden">
        <div className="w-full sm:w-auto">
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-full sm:w-[200px] rounded-xl text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua Periode</SelectItem>
              {periods?.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isManager && filterPeriod !== "all" && (
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-xs h-10 sm:h-9" onClick={() => markAllPaid.mutate({ period: filterPeriod })}>
            <CheckCheck className="mr-2 h-4 w-4" /> Tandai Semua Dibayar
          </Button>
        )}
      </div>

      {!isManager && (
        <Alert className="bg-blue-50/60 text-slate-900 border-blue-100 rounded-2xl p-4">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <AlertTitle className="text-blue-900 font-semibold text-xs sm:text-sm">Informasi Komponen Gaji</AlertTitle>
          <AlertDescription className="text-xs text-slate-700 mt-2 space-y-1.5 leading-relaxed">
            <p><strong>Tunjangan (Allowance):</strong> 10% tetap dari Gaji Pokok.</p>
            <p><strong>Potongan (Deduction):</strong> Dihitung prorata jika Anda memiliki catatan tidak hadir di luar status 'Hadir' (Present) dan 'Terlambat' (Late) berdasar asumsi 22 hari kerja.</p>
            <p><strong>Pajak (PPh21):</strong> 5% flat dari Gaji Kotor (Pokok + Tunjangan - Potongan).</p>
          </AlertDescription>
        </Alert>
      )}

      {/* MOBILE LIST VIEW (For Smartphone Screens) */}
      <div className="block md:hidden space-y-3 w-full min-w-0">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900">Daftar Slip Gaji</h2>
          <span className="text-xs text-slate-400 font-medium">({slips?.length ?? 0} Slip)</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Memuat slip gaji...
          </div>
        ) : (slips ?? []).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Belum ada slip gaji{isManager ? " — klik Generate Payroll untuk membuat" : ""}
          </div>
        ) : (
          slips?.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 w-full min-w-0 overflow-hidden">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{s.employeeName}</p>
                  <p className="text-xs text-slate-400">{s.employeeNo} • Periode {s.period}</p>
                </div>
                <Badge variant={statusVariant(s.status)} className="capitalize text-[10px] px-2 py-0.5 shrink-0">
                  {statusLabel(s.status)}
                  {s.paidAt && <span className="ml-1 opacity-70">· {formatDateTime(s.paidAt).split(",")[0]}</span>}
                </Badge>
              </div>

              {/* Total Net Salary Highlight Card */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">Gaji Bersih Diterima:</span>
                <span className="text-base font-extrabold text-emerald-700">{formatRupiah(s.netSalary)}</span>
              </div>

              {/* Salary Components Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-500">Gaji Pokok</span>
                  <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(s.baseSalary)}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-500">Tunjangan (10%)</span>
                  <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(s.allowance + s.overtime + s.bonus)}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-rose-600">Potongan Absensi</span>
                    {s.deduction > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-rose-600 hover:underline text-[10px] font-bold flex items-center gap-0.5">
                            Detail <Info className="h-2.5 w-2.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 text-sm" side="top">
                          <div className="space-y-2">
                            <p className="font-semibold text-slate-900">Rincian Potongan</p>
                            <div className="text-xs text-slate-600 space-y-1">
                              <div className="flex justify-between"><span>Asumsi Hari Kerja:</span><span>22 Hari</span></div>
                              <div className="flex justify-between"><span>Kehadiran:</span><span>{Math.round(22 * (1 - s.deduction / (s.baseSalary || 1)))} Hari</span></div>
                              <div className="flex justify-between text-rose-600 font-bold"><span>Tidak Hadir:</span><span>{22 - Math.round(22 * (1 - s.deduction / (s.baseSalary || 1)))} Hari</span></div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <p className="font-bold text-rose-600 mt-0.5">-{formatRupiah(s.deduction)}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-amber-600">Pajak PPh21 (5%)</span>
                    {s.tax > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="text-amber-600 hover:underline text-[10px] font-bold flex items-center gap-0.5">
                            Detail <Info className="h-2.5 w-2.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 text-sm" side="top">
                          <div className="space-y-2">
                            <p className="font-semibold text-slate-900">Rincian Pajak (PPh 21)</p>
                            <div className="text-xs text-slate-600 space-y-1">
                              <div className="flex justify-between"><span>Gaji Pokok:</span><span>{formatRupiah(s.baseSalary)}</span></div>
                              <div className="flex justify-between"><span>Tunjangan:</span><span>{formatRupiah(s.allowance + s.overtime + s.bonus)}</span></div>
                              <div className="flex justify-between text-rose-600"><span>Potongan:</span><span>-{formatRupiah(s.deduction)}</span></div>
                              <div className="flex justify-between font-bold pt-1 border-t"><span>Total Pajak 5%:</span><span className="text-amber-600">-{formatRupiah(s.tax)}</span></div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <p className="font-bold text-amber-600 mt-0.5">-{formatRupiah(s.tax)}</p>
                </div>
              </div>

              {isManager && s.status === "draft" && (
                <Button 
                  onClick={() => markPaid.mutate({ id: s.id })} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 mt-1"
                >
                  <CheckCheck className="mr-1.5 h-4 w-4" /> Tandai Lunas / Dibayar
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <Card className="hidden md:block border-slate-200 shadow-xs overflow-hidden w-full min-w-0">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-bold text-slate-900">Slip Gaji Karyawan</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">Periode</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Karyawan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Pokok</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Tunjangan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Potongan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Pajak</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Gaji Bersih</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                {isManager && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-slate-400 font-medium">
                    Memuat slip gaji...
                  </TableCell>
                </TableRow>
              ) : (
                slips?.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="whitespace-nowrap font-medium text-slate-800 text-xs">{s.period}</TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-900 text-xs">{s.employeeName}</p>
                      <p className="text-[11px] text-slate-400">{s.employeeNo}</p>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs font-medium text-slate-800">{formatRupiah(s.baseSalary)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs text-slate-700">
                      {formatRupiah(s.allowance + s.overtime + s.bonus)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs font-medium text-rose-600">
                      {s.deduction > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="inline-flex items-center gap-1 hover:underline underline-offset-4 cursor-pointer focus:outline-none">
                              -{formatRupiah(s.deduction)}
                              <Info className="h-3 w-3 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 text-sm" side="top">
                            <div className="space-y-2">
                              <p className="font-semibold text-slate-900">Rincian Potongan</p>
                              <div className="text-xs text-slate-600 space-y-1">
                                <div className="flex justify-between">
                                  <span>Asumsi Hari Kerja:</span>
                                  <span>22 Hari</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kehadiran Tercatat:</span>
                                  <span>{Math.round(22 * (1 - s.deduction / (s.baseSalary || 1)))} Hari</span>
                                </div>
                                <div className="flex justify-between text-rose-600 font-bold">
                                  <span>Tidak Hadir/Absen:</span>
                                  <span>{22 - Math.round(22 * (1 - s.deduction / (s.baseSalary || 1)))} Hari</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-400 italic mt-1 leading-tight">
                                *Pemotongan dihitung secara prorata berdasarkan jumlah hari ketidakhadiran di luar status Hadir dan Terlambat.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        `-${formatRupiah(s.deduction)}`
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs font-medium text-amber-600">
                      {s.tax > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="inline-flex items-center gap-1 hover:underline underline-offset-4 cursor-pointer focus:outline-none">
                              -{formatRupiah(s.tax)}
                              <Info className="h-3 w-3 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 text-sm" side="top">
                            <div className="space-y-2">
                              <p className="font-semibold text-slate-900">Rincian Pajak (PPh 21)</p>
                              <div className="pt-2 border-t text-xs text-slate-600 space-y-1">
                                <div className="flex justify-between">
                                  <span>Gaji Pokok:</span>
                                  <span>{formatRupiah(s.baseSalary)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Total Tunjangan:</span>
                                  <span>{formatRupiah(s.allowance + s.overtime + s.bonus)}</span>
                                </div>
                                <div className="flex justify-between text-rose-600">
                                  <span>Potongan Absensi:</span>
                                  <span>-{formatRupiah(s.deduction)}</span>
                                </div>
                              </div>
                              <div className="pt-2 border-t text-xs">
                                <div className="flex justify-between font-bold text-slate-900">
                                  <span>Dasar Pengenaan Pajak:</span>
                                  <span>{formatRupiah(s.baseSalary + s.allowance + s.overtime + s.bonus - s.deduction)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-amber-600 mt-1">
                                  <span>Total Pajak (5%):</span>
                                  <span>-{formatRupiah(s.tax)}</span>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        `-${formatRupiah(s.tax)}`
                      )}
                    </TableCell>
                    <TableCell className="text-right font-extrabold whitespace-nowrap text-xs text-emerald-700">
                      {formatRupiah(s.netSalary)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)} className="capitalize text-xs">
                        {statusLabel(s.status)}
                        {s.paidAt && <span className="ml-1 opacity-70">· {formatDateTime(s.paidAt).split(",")[0]}</span>}
                      </Badge>
                    </TableCell>
                    {isManager && (
                      <TableCell className="text-right">
                        {s.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-600 hover:text-emerald-700 h-8 w-8"
                            title="Tandai dibayar"
                            onClick={() => markPaid.mutate({ id: s.id })}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
              {!isLoading && (slips ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-xs text-slate-400 font-medium">
                    Belum ada slip gaji{isManager ? " — klik Generate Payroll untuk membuat" : ""}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
