import { useState } from "react";
import { Plus, Check, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, statusLabel, statusVariant } from "@/lib/format";

const LEAVE_TYPES = ["annual", "sick", "maternity", "unpaid", "other"] as const;

export default function Leave() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "hr";
  const utils = trpc.useUtils();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    type: "annual" as (typeof LEAVE_TYPES)[number],
    startDate: "",
    endDate: "",
    reason: "",
  });

  const { data: leaves, isLoading } = trpc.leave.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter as "pending" | "approved" | "rejected" } : undefined,
  );
  const { data: employees } = trpc.employee.list.useQuery({}, { enabled: isManager });

  const invalidate = () => utils.leave.list.invalidate();

  const create = trpc.leave.create.useMutation({
    onSuccess: () => {
      toast.success("Pengajuan cuti terkirim");
      setDialog(false);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const decide = trpc.leave.decide.useMutation({
    onSuccess: (_, v) => {
      toast.success(v.status === "approved" ? "Cuti disetujui" : "Cuti ditolak");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.leave.delete.useMutation({
    onSuccess: () => { toast.success("Pengajuan dihapus"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 w-full min-w-0 overflow-x-hidden">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs w-full min-w-0 overflow-hidden">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">Manajemen Cuti</h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Pengajuan dan persetujuan cuti karyawan</p>
        </div>
        <Button
          onClick={() => {
            setForm({ employeeId: "", type: "annual", startDate: "", endDate: "", reason: "" });
            setDialog(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 sm:h-10 text-xs shadow-md w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" /> Ajukan Cuti
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="w-full overflow-x-auto">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="rounded-xl bg-slate-100 p-1">
            <TabsTrigger value="all" className="rounded-lg text-xs">Semua</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg text-xs">Menunggu</TabsTrigger>
            <TabsTrigger value="approved" className="rounded-lg text-xs">Disetujui</TabsTrigger>
            <TabsTrigger value="rejected" className="rounded-lg text-xs">Ditolak</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* MOBILE LIST VIEW (For Smartphone Screens) */}
      <div className="block sm:hidden space-y-3 w-full min-w-0">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900">Daftar Pengajuan Cuti</h2>
          <span className="text-xs text-slate-400 font-medium">({leaves?.length ?? 0} Pengajuan)</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Memuat pengajuan cuti...
          </div>
        ) : (leaves ?? []).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Belum ada pengajuan cuti
          </div>
        ) : (
          leaves?.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 w-full min-w-0 overflow-hidden">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <p className="font-bold text-slate-900 text-xs">{l.employeeName}</p>
                  <p className="text-[10px] text-slate-400">{l.employeeNo}</p>
                </div>
                <Badge variant={statusVariant(l.status)} className="capitalize text-[10px] px-2 py-0.5 shrink-0">
                  {statusLabel(l.status)}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tipe Cuti:</span>
                  <span className="font-semibold text-slate-800">{statusLabel(l.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Periode:</span>
                  <span className="font-semibold text-slate-800">{formatDate(l.startDate)} – {formatDate(l.endDate)} ({l.days} Hari)</span>
                </div>
                {l.reason && (
                  <div className="pt-1 border-t border-slate-200/60 mt-1">
                    <span className="text-[10px] font-semibold text-slate-400 block">Alasan:</span>
                    <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{l.reason}</p>
                  </div>
                )}
              </div>

              {isManager && (
                <div className="pt-1 flex gap-2">
                  {l.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9"
                        onClick={() => decide.mutate({ id: l.id, status: "approved" })}
                      >
                        <Check className="mr-1.5 h-4 w-4" /> Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50 font-bold rounded-xl text-xs h-9"
                        onClick={() => decide.mutate({ id: l.id, status: "rejected" })}
                      >
                        <X className="mr-1.5 h-4 w-4" /> Tolak
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-rose-500 hover:bg-rose-50 rounded-xl text-xs h-8"
                      onClick={() => {
                        if (confirm("Hapus pengajuan ini?")) remove.mutate({ id: l.id });
                      }}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" /> Hapus Pengajuan
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <Card className="hidden sm:block border-slate-200 shadow-xs overflow-hidden w-full min-w-0">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">Karyawan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Tipe Cuti</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Periode</TableHead>
                <TableHead className="hidden md:table-cell text-xs font-bold text-slate-700">Alasan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                {isManager && <TableHead className="w-[120px] text-right" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-slate-400 font-medium">
                    Memuat data cuti...
                  </TableCell>
                </TableRow>
              ) : (
                leaves?.map((l) => (
                  <TableRow key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell>
                      <p className="font-bold text-slate-900 text-xs">{l.employeeName}</p>
                      <p className="text-[11px] text-slate-400">{l.employeeNo}</p>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-800">{statusLabel(l.type)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-700">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      <span className="ml-1 text-[11px] text-slate-400 font-medium">({l.days} hari)</span>
                    </TableCell>
                    <TableCell className="hidden max-w-[260px] truncate md:table-cell text-xs text-slate-600">
                      {l.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(l.status)} className="capitalize text-xs">{statusLabel(l.status)}</Badge>
                    </TableCell>
                    {isManager && (
                      <TableCell className="text-right">
                        {l.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-emerald-600 hover:text-emerald-700 h-8 w-8"
                              title="Setujui"
                              onClick={() => decide.mutate({ id: l.id, status: "approved" })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:text-rose-600 h-8 w-8"
                              title="Tolak"
                              onClick={() => decide.mutate({ id: l.id, status: "rejected" })}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-rose-500 h-8 w-8"
                            onClick={() => {
                              if (confirm("Hapus pengajuan ini?")) remove.mutate({ id: l.id });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
              {!isLoading && (leaves ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                    <CalendarDays className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                    Belum ada pengajuan cuti
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Ajukan Cuti */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="rounded-2xl w-[95%] max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Cuti Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isManager && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Karyawan</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs"><SelectValue placeholder="Diri sendiri (default)" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {employees?.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipe Cuti *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as any }))}>
                <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{statusLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Mulai *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tanggal Selesai *</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Alasan Cuti</Label>
              <Textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Jelaskan alasan pengajuan cuti..."
                rows={3}
                className="rounded-xl text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!form.startDate || !form.endDate) {
                  toast.error("Tanggal mulai dan selesai harus diisi");
                  return;
                }
                create.mutate({
                  employeeId: form.employeeId ? Number(form.employeeId) : undefined,
                  type: form.type,
                  startDate: form.startDate,
                  endDate: form.endDate,
                  reason: form.reason || undefined,
                });
              }}
              disabled={create.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
            >
              Kirim Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
