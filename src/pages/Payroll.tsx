import { useState } from "react";
import { Wallet, Play, CheckCheck, Receipt, Banknote } from "lucide-react";
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
import { Info } from "lucide-react";
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Penggajian otomatis berbasis absensi (potongan proporsional, tunjangan 10%, PPh21 5%)
          </p>
        </div>
        {isManager && (
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Periode</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-[170px]" />
            </div>
            <Button onClick={() => generate.mutate({ period })} disabled={generate.isPending}>
              <Play className="mr-2 h-4 w-4" />
              {generate.isPending ? "Memproses..." : "Generate Payroll"}
            </Button>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Gaji Bersih</p>
              <p className="text-lg font-bold">{formatRupiah(Number(summary?.totals.totalNet ?? 0))}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pajak (PPh21)</p>
              <p className="text-lg font-bold">{formatRupiah(Number(summary?.totals.totalTax ?? 0))}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jumlah Slip</p>
              <p className="text-lg font-bold">{summary?.totals.count ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Periode</SelectItem>
            {periods?.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isManager && filterPeriod !== "all" && (
          <Button variant="outline" size="sm" onClick={() => markAllPaid.mutate({ period: filterPeriod })}>
            <CheckCheck className="mr-2 h-4 w-4" /> Tandai Semua Dibayar
          </Button>
        )}
      </div>

      {!isManager && (
        <Alert className="bg-blue-50/60 text-slate-900 border-blue-100">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 font-semibold">Informasi Komponen Gaji</AlertTitle>
          <AlertDescription className="text-xs text-slate-700 mt-2 space-y-1">
            <p><strong>Tunjangan (Allowance):</strong> 10% tetap dari Gaji Pokok.</p>
            <p><strong>Potongan (Deduction):</strong> Dihitung prorata jika Anda memiliki catatan tidak hadir di luar status 'Hadir' (Present) dan 'Terlambat' (Late) berdasar asumsi 22 hari kerja.</p>
            <p><strong>Pajak (PPh21):</strong> 5% flat dari Gaji Kotor (Pokok + Tunjangan - Potongan).</p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Slip Gaji</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periode</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead className="text-right">Pokok</TableHead>
                <TableHead className="text-right">Tunjangan</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right">Pajak</TableHead>
                <TableHead className="text-right">Bersih</TableHead>
                <TableHead>Status</TableHead>
                {isManager && <TableHead className="w-[60px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : (
                slips?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">{s.period}</TableCell>
                    <TableCell>
                      <p className="font-medium">{s.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{s.employeeNo}</p>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">{formatRupiah(s.baseSalary)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="md:hidden text-muted-foreground mr-2 font-normal text-xs">Tunjangan:</span>
                      {formatRupiah(s.allowance + s.overtime + s.bonus)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-red-600">
                      <span className="md:hidden text-muted-foreground mr-2 font-normal text-xs">Potongan:</span>
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
                              <p className="font-semibold text-slate-900 dark:text-slate-100">Rincian Potongan</p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div className="flex justify-between">
                                  <span>Asumsi Hari Kerja:</span>
                                  <span>22 Hari</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Kehadiran Tercatat:</span>
                                  <span>{Math.round(22 * (1 - s.deduction / (s.baseSalary || 1)))} Hari</span>
                                </div>
                                <div className="flex justify-between text-red-600 font-medium">
                                  <span>Tidak Hadir/Absen:</span>
                                  <span>{22 - Math.round(22 * (1 - s.deduction / (s.baseSalary || 1)))} Hari</span>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground italic mt-1 leading-tight">
                                *Pemotongan dihitung secara prorata berdasarkan jumlah hari ketidakhadiran di luar status Hadir dan Terlambat.
                              </p>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        `-${formatRupiah(s.deduction)}`
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-amber-600">
                      <span className="lg:hidden text-muted-foreground mr-2 font-normal text-xs">Pajak:</span>
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
                              <p className="font-semibold text-slate-900 dark:text-slate-100">Rincian Pajak (PPh 21)</p>
                              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                                <div className="flex justify-between">
                                  <span>Gaji Pokok:</span>
                                  <span>{formatRupiah(s.baseSalary)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Total Tunjangan:</span>
                                  <span>{formatRupiah(s.allowance + s.overtime + s.bonus)}</span>
                                </div>
                                <div className="flex justify-between text-red-600">
                                  <span>Potongan Absensi:</span>
                                  <span>-{formatRupiah(s.deduction)}</span>
                                </div>
                              </div>
                              <div className="pt-2 border-t text-xs">
                                <div className="flex justify-between font-medium">
                                  <span>Dasar Pengenaan Pajak:</span>
                                  <span>{formatRupiah(s.baseSalary + s.allowance + s.overtime + s.bonus - s.deduction)}</span>
                                </div>
                                <div className="flex justify-between font-medium mt-1">
                                  <span>Total Pajak (5%):</span>
                                  <span className="text-amber-600">-{formatRupiah(s.tax)}</span>
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        `-${formatRupiah(s.tax)}`
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">
                      {formatRupiah(s.netSalary)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>
                        {statusLabel(s.status)}
                        {s.paidAt && <span className="ml-1 opacity-70">· {formatDateTime(s.paidAt).split(",")[0]}</span>}
                      </Badge>
                    </TableCell>
                    {isManager && (
                      <TableCell>
                        {s.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-600"
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
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
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
