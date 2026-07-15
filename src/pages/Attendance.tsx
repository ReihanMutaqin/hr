import { useState } from "react";
import { Clock, LogIn, LogOut, CalendarCheck, UserCheck, UserX, Plus } from "lucide-react";
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
import { formatTime, formatDate, statusLabel, statusVariant } from "@/lib/format";

const ATT_STATUSES = ["present", "late", "absent", "leave", "sick", "holiday"] as const;

export default function Attendance() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "hr";
  const utils = trpc.useUtils();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [empFilter, setEmpFilter] = useState("all");
  const [markDialog, setMarkDialog] = useState(false);
  const [markForm, setMarkForm] = useState({
    employeeId: "",
    date: today,
    status: "present" as (typeof ATT_STATUSES)[number],
    notes: "",
  });

  const { data: records, isLoading } = trpc.attendance.list.useQuery({
    from,
    to,
    employeeId: empFilter !== "all" ? Number(empFilter) : undefined,
  });
  const { data: summary } = trpc.attendance.todaySummary.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({}, { enabled: isManager });

  const invalidate = () => {
    utils.attendance.list.invalidate();
    utils.attendance.todaySummary.invalidate();
  };

  const checkIn = trpc.attendance.checkIn.useMutation({
    onSuccess: (r) => {
      toast.success(r.status === "late" ? "Check-in dicatat (terlambat)" : "Check-in berhasil");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const checkOut = trpc.attendance.checkOut.useMutation({
    onSuccess: () => { toast.success("Check-out berhasil"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const mark = trpc.attendance.mark.useMutation({
    onSuccess: () => { toast.success("Absensi dicatat"); setMarkDialog(false); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const statusCount = (s: string) => summary?.byStatus.find((x) => x.status === s)?.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Absensi</h1>
          <p className="text-sm text-muted-foreground">Pencatatan kehadiran karyawan harian</p>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <Button variant="outline" onClick={() => setMarkDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Catat Manual
            </Button>
          )}
          {user?.employeeId && (
            <>
              <Button onClick={() => checkIn.mutate({})} disabled={checkIn.isPending}>
                <LogIn className="mr-2 h-4 w-4" /> Check-in
              </Button>
              <Button variant="secondary" onClick={() => checkOut.mutate({})} disabled={checkOut.isPending}>
                <LogOut className="mr-2 h-4 w-4" /> Check-out
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Today summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Karyawan Aktif</p>
              <p className="text-xl font-bold">{summary?.activeEmployees ?? "-"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hadir</p>
              <p className="text-xl font-bold">{statusCount("present")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Terlambat</p>
              <p className="text-xl font-bold">{statusCount("late")}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <UserX className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Alpa / Cuti / Sakit</p>
              <p className="text-xl font-bold">
                {statusCount("absent") + statusCount("leave") + statusCount("sick")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Dari</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Sampai</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
        </div>
        {isManager && (
          <div className="space-y-1">
            <Label className="text-xs">Karyawan</Label>
            <Select value={empFilter} onValueChange={setEmpFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Karyawan</SelectItem>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Riwayat Absensi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Karyawan</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : (
                records?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(r.date)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{r.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{r.employeeNo}</p>
                    </TableCell>
                    <TableCell>{formatTime(r.checkIn)}</TableCell>
                    <TableCell>{formatTime(r.checkOut)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {r.notes ?? "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && (records ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Tidak ada data absensi pada rentang ini
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mark dialog */}
      <Dialog open={markDialog} onOpenChange={setMarkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catat Absensi Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Karyawan *</Label>
              <Select
                value={markForm.employeeId}
                onValueChange={(v) => setMarkForm((f) => ({ ...f, employeeId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                <SelectContent>
                  {employees?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal *</Label>
              <Input
                type="date"
                value={markForm.date}
                onChange={(e) => setMarkForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status *</Label>
              <Select
                value={markForm.status}
                onValueChange={(v) => setMarkForm((f) => ({ ...f, status: v as typeof f.status }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Input
                value={markForm.notes}
                onChange={(e) => setMarkForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkDialog(false)}>Batal</Button>
            <Button
              disabled={!markForm.employeeId || mark.isPending}
              onClick={() =>
                mark.mutate({
                  employeeId: Number(markForm.employeeId),
                  date: markForm.date,
                  status: markForm.status,
                  notes: markForm.notes || undefined,
                })
              }
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
