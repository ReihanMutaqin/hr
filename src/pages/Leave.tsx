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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Cuti</h1>
          <p className="text-sm text-muted-foreground">Pengajuan dan persetujuan cuti karyawan</p>
        </div>
        <Button
          onClick={() => {
            setForm({ employeeId: "", type: "annual", startDate: "", endDate: "", reason: "" });
            setDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Ajukan Cuti
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="pending">Menunggu</TabsTrigger>
          <TabsTrigger value="approved">Disetujui</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="hidden md:table-cell">Alasan</TableHead>
                <TableHead>Status</TableHead>
                {isManager && <TableHead className="w-[120px]" />}
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
                leaves?.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-medium">{l.employeeName}</p>
                      <p className="text-xs text-muted-foreground">{l.employeeNo}</p>
                    </TableCell>
                    <TableCell>{statusLabel(l.type)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      <span className="ml-1 text-xs text-muted-foreground">({l.days} hari)</span>
                    </TableCell>
                    <TableCell className="hidden max-w-[260px] truncate md:table-cell text-sm text-muted-foreground">
                      {l.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(l.status)}>{statusLabel(l.status)}</Badge>
                    </TableCell>
                    {isManager && (
                      <TableCell>
                        {l.status === "pending" ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-emerald-600"
                              title="Setujui"
                              onClick={() => decide.mutate({ id: l.id, status: "approved" })}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500"
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
                            className="text-red-400"
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
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    <CalendarDays className="mx-auto mb-2 h-8 w-8" />
                    Belum ada pengajuan cuti
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Cuti</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isManager && (
              <div className="space-y-1.5">
                <Label>Karyawan</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Diri sendiri (default)" /></SelectTrigger>
                  <SelectContent>
                    {employees?.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Tipe Cuti *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as typeof f.type }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{statusLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Mulai *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Selesai *</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Alasan *</Label>
              <Textarea
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button
              disabled={!form.startDate || !form.endDate || !form.reason.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  employeeId: form.employeeId ? Number(form.employeeId) : undefined,
                  type: form.type,
                  startDate: form.startDate,
                  endDate: form.endDate,
                  reason: form.reason,
                })
              }
            >
              Kirim Pengajuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
