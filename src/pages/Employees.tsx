import { useState } from "react";
import { Plus, Search, Sparkles, Pencil, Trash2, X, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/providers/trpc";
import {
  formatRupiah,
  formatDate,
  initials,
  statusLabel,
  statusVariant,
} from "@/lib/format";

type EmployeeForm = {
  employeeNo: string;
  fullName: string;
  email: string;
  phone: string;
  gender: "male" | "female";
  birthDate: string;
  address: string;
  departmentId: string;
  positionId: string;
  hireDate: string;
  status: "active" | "probation" | "resigned" | "terminated";
  baseSalary: string;
  skills: string;
  bio: string;
};

const EMPTY_FORM: EmployeeForm = {
  employeeNo: "",
  fullName: "",
  email: "",
  phone: "",
  gender: "male",
  birthDate: "",
  address: "",
  departmentId: "",
  positionId: "",
  hireDate: new Date().toISOString().slice(0, 10),
  status: "active",
  baseSalary: "",
  skills: "",
  bio: "",
};

export default function Employees() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<
    | { results: Array<{ score: number; employee: Record<string, unknown> & { id: number; fullName: string } }>; model: string; fallback: boolean }
    | null
  >(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: employees, isLoading } = trpc.employee.list.useQuery({
    search: search || undefined,
    departmentId: deptFilter !== "all" ? Number(deptFilter) : undefined,
  });
  const { data: departments } = trpc.org.departments.useQuery();
  const { data: positions } = trpc.org.positions.useQuery();

  const invalidate = () => utils.employee.list.invalidate();

  const create = trpc.employee.create.useMutation({
    onSuccess: () => {
      toast.success("Karyawan berhasil ditambahkan");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.employee.update.useMutation({
    onSuccess: () => {
      toast.success("Data karyawan diperbarui");
      setDialogOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.employee.delete.useMutation({
    onSuccess: () => {
      toast.success("Karyawan dihapus");
      setDeleteId(null);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const aiSearch = trpc.employee.aiSearch.useMutation({
    onSuccess: (data) => {
      setAiResults(data as typeof aiResults);
      toast.success(
        data.fallback
          ? "Pencarian AI selesai (mode fallback keyword)"
          : `Pencarian AI selesai — model ${data.model.split("/").pop()}`,
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (emp: NonNullable<typeof employees>[number]) => {
    setEditingId(emp.id);
    setForm({
      employeeNo: emp.employeeNo,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone ?? "",
      gender: emp.gender,
      birthDate: emp.birthDate ?? "",
      address: emp.address ?? "",
      departmentId: emp.departmentId ? String(emp.departmentId) : "",
      positionId: emp.positionId ? String(emp.positionId) : "",
      hireDate: emp.hireDate,
      status: emp.status,
      baseSalary: String(emp.baseSalary),
      skills: emp.skills ?? "",
      bio: emp.bio ?? "",
    });
    setDialogOpen(true);
  };

  const submitForm = () => {
    const payload = {
      employeeNo: form.employeeNo,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || undefined,
      gender: form.gender,
      birthDate: form.birthDate || undefined,
      address: form.address || undefined,
      departmentId: form.departmentId ? Number(form.departmentId) : undefined,
      positionId: form.positionId ? Number(form.positionId) : undefined,
      hireDate: form.hireDate,
      status: form.status,
      baseSalary: Number(form.baseSalary) || 0,
      skills: form.skills || undefined,
      bio: form.bio || undefined,
    };
    if (editingId) update.mutate({ id: editingId, ...payload });
    else create.mutate(payload);
  };

  const set = (k: keyof EmployeeForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Karyawan</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data karyawan dengan pencarian AI semantik
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Karyawan
        </Button>
      </div>

      {/* AI semantic search */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-900">Pencarian AI Semantik</span>
            <span className="text-xs text-indigo-500">powered by Nemotron Rerank</span>
          </div>
          <div className="flex gap-2">
            <Input
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder='Contoh: "karyawan yang ahli React dan pernah memimpin tim"'
              className="bg-white"
              onKeyDown={(e) => {
                if (e.key === "Enter" && aiQuery.trim().length >= 2) aiSearch.mutate({ query: aiQuery });
              }}
            />
            <Button
              onClick={() => aiSearch.mutate({ query: aiQuery })}
              disabled={aiQuery.trim().length < 2 || aiSearch.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {aiSearch.isPending ? "Menganalisis..." : "Cari dengan AI"}
            </Button>
            {aiResults && (
              <Button variant="ghost" size="icon" onClick={() => setAiResults(null)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {aiResults && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-indigo-600">
                {aiResults.results.length} karyawan diperingkat · model: {aiResults.model}
                {aiResults.fallback && " (fallback)"}
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {aiResults.results.slice(0, 9).map((r, i) => {
                  const emp = r.employee as {
                    id: number;
                    fullName: string;
                    positionTitle: string | null;
                    departmentName: string | null;
                    skills: string | null;
                    status: string;
                  };
                  return (
                    <div key={emp.id} className="rounded-lg border bg-white p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          #{i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{emp.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {emp.positionTitle} · {emp.departmentName}
                          </p>
                        </div>
                        <Badge className="bg-indigo-600">{r.score.toFixed(0)}</Badge>
                      </div>
                      {emp.skills && (
                        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">{emp.skills}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, NIK, skill..."
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Semua Departemen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Departemen</SelectItem>
            {departments?.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : (employees ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <UsersIcon className="h-10 w-10" />
              <p className="text-sm">Tidak ada karyawan ditemukan</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Karyawan</TableHead>
                  <TableHead className="hidden md:table-cell">Departemen</TableHead>
                  <TableHead className="hidden lg:table-cell">Jabatan</TableHead>
                  <TableHead className="hidden lg:table-cell">Bergabung</TableHead>
                  <TableHead className="hidden xl:table-cell text-right">Gaji Pokok</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees?.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-slate-200 text-xs">
                            {initials(emp.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            {emp.employeeNo} · {emp.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{emp.departmentName ?? "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{emp.positionTitle ?? "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{formatDate(emp.hireDate)}</TableCell>
                    <TableCell className="hidden xl:table-cell text-right">
                      {formatRupiah(emp.baseSalary)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(emp.status)}>{statusLabel(emp.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => setDeleteId(emp.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Karyawan" : "Tambah Karyawan"}</DialogTitle>
            <DialogDescription>Lengkapi informasi karyawan di bawah ini</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>No. Karyawan *</Label>
              <Input value={form.employeeNo} onChange={set("employeeNo")} placeholder="EMP025" />
            </div>
            <div className="space-y-1.5">
              <Label>Nama Lengkap *</Label>
              <Input value={form.fullName} onChange={set("fullName")} />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={set("email")} />
            </div>
            <div className="space-y-1.5">
              <Label>Telepon</Label>
              <Input value={form.phone} onChange={set("phone")} />
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Kelamin</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm((f) => ({ ...f, gender: v as "male" | "female" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Laki-laki</SelectItem>
                  <SelectItem value="female">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Lahir</Label>
              <Input type="date" value={form.birthDate} onChange={set("birthDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Departemen</Label>
              <Select
                value={form.departmentId}
                onValueChange={(v) => setForm((f) => ({ ...f, departmentId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jabatan</Label>
              <Select
                value={form.positionId}
                onValueChange={(v) => setForm((f) => ({ ...f, positionId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                <SelectContent>
                  {positions?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.title} ({p.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Bergabung *</Label>
              <Input type="date" value={form.hireDate} onChange={set("hireDate")} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as EmployeeForm["status"] }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="probation">Percobaan</SelectItem>
                  <SelectItem value="resigned">Resign</SelectItem>
                  <SelectItem value="terminated">Terminasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gaji Pokok (Rp) *</Label>
              <Input type="number" value={form.baseSalary} onChange={set("baseSalary")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Alamat</Label>
              <Input value={form.address} onChange={set("address")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Skills</Label>
              <Input value={form.skills} onChange={set("skills")} placeholder="React, TypeScript, ..." />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Bio</Label>
              <Textarea value={form.bio} onChange={set("bio")} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={submitForm} disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus karyawan?</AlertDialogTitle>
            <AlertDialogDescription>
              Data karyawan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && remove.mutate({ id: deleteId })}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
