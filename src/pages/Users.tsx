import { useState } from "react";
import { Plus, UserCog, Trash2, ShieldCheck, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/format";

const ROLES = ["admin", "hr", "employee"] as const;
const ROLE_LABELS = {
  admin: "Administrator",
  hr: "HR Manager",
  employee: "Karyawan",
} as const;

const ROLE_COLORS = {
  admin: "default",
  hr: "secondary",
  employee: "outline",
} as const;

type UserRole = (typeof ROLES)[number];

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const isHR = currentUser?.role === "hr";

  const utils = trpc.useUtils();

  // Create dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    fullName: "",
    email: "",
    role: "employee" as UserRole,
    employeeId: "",
  });

  // Reset password dialog
  const [resetDialog, setResetDialog] = useState<{ open: boolean; userId: number; userName: string }>({
    open: false,
    userId: 0,
    userName: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit dialog


  const { data: users, isLoading } = trpc.auth.listUsers.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({});

  const create = trpc.auth.createUser.useMutation({
    onSuccess: () => {
      toast.success("Pengguna berhasil dibuat");
      setCreateDialog(false);
      resetForm();
      utils.auth.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const update = trpc.auth.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Pengguna diperbarui");
      utils.auth.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const remove = trpc.auth.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Pengguna dihapus");
      utils.auth.listUsers.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resetPassword = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password berhasil direset");
      setResetDialog({ open: false, userId: 0, userName: "" });
      setNewPassword("");
    },
    onError: (e) => toast.error(e.message),
  });

  const resetForm = () => {
    setForm({ username: "", password: "", fullName: "", email: "", role: "employee", employeeId: "" });
    setShowPassword(false);
  };

  // HR can only set employee role
  const availableRoles = isAdmin ? ROLES : (["employee"] as const);

  const pageTitle = isAdmin ? "Manajemen Pengguna" : "Akun Karyawan";
  const pageDesc = isAdmin
    ? "Kelola akun login, role, dan hak akses seluruh pengguna sistem"
    : "Buat dan kelola akun login untuk karyawan";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground">{pageDesc}</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setCreateDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {isAdmin ? "Tambah Pengguna" : "Tambah Akun Karyawan"}
        </Button>
      </div>

      {/* Stats banner for admin */}
      {isAdmin && users && (
        <div className="flex flex-wrap gap-3">
          {ROLES.map((role) => {
            const count = users.filter((u) => u.role === role).length;
            return (
              <div
                key={role}
                className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm"
              >
                <Badge variant={ROLE_COLORS[role]}>{ROLE_LABELS[role]}</Badge>
                <span className="font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengguna</TableHead>
                <TableHead>Role</TableHead>
                {isAdmin && <TableHead className="hidden md:table-cell">Login Terakhir</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="w-[200px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        @{u.username} {u.email ? `· ${u.email}` : ""}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_COLORS[u.role]}>
                        {u.role === "admin" && <ShieldCheck className="mr-1 h-3 w-3" />}
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatDateTime(u.lastLoginAt)}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={u.isActive ? "outline" : "destructive"}>
                        {u.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {/* Toggle Active — admin for all, HR for employees only */}
                        {(isAdmin || (isHR && u.role === "employee")) && u.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => update.mutate({ id: u.id, isActive: !u.isActive })}
                          >
                            {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </Button>
                        )}

                        {/* Reset Password */}
                        {(isAdmin || (isHR && u.role === "employee")) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Reset Password"
                            onClick={() => {
                              setNewPassword("");
                              setShowNewPassword(false);
                              setResetDialog({ open: true, userId: u.id, userName: u.fullName });
                            }}
                          >
                            <KeyRound className="h-4 w-4 text-amber-500" />
                          </Button>
                        )}

                        {/* Delete */}
                        {(isAdmin || (isHR && u.role === "employee")) && u.id !== currentUser?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Pengguna</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Yakin hapus akun <strong>@{u.username}</strong>? Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-500 hover:bg-red-600"
                                  onClick={() => remove.mutate({ id: u.id })}
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && (users ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    <UserCog className="mx-auto mb-2 h-8 w-8" />
                    {isHR ? "Belum ada akun karyawan" : "Belum ada pengguna"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isAdmin ? "Tambah Pengguna Baru" : "Tambah Akun Karyawan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input
                  placeholder="min. 3 karakter"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="min. 6 karakter"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nama Lengkap *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isHR && (
                  <p className="text-xs text-muted-foreground">
                    HR hanya dapat membuat akun dengan role Karyawan
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Tautkan ke Data Karyawan</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tidak ditautkan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.fullName} — {e.employeeNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialog(false); resetForm(); }}>
              Batal
            </Button>
            <Button
              disabled={
                form.username.trim().length < 3 ||
                form.password.length < 6 ||
                !form.fullName.trim() ||
                create.isPending
              }
              onClick={() =>
                create.mutate({
                  username: form.username,
                  password: form.password,
                  fullName: form.fullName,
                  email: form.email || undefined,
                  role: form.role,
                  employeeId: form.employeeId ? Number(form.employeeId) : undefined,
                })
              }
            >
              {create.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetDialog.open}
        onOpenChange={(open) => {
          if (!open) setResetDialog({ open: false, userId: 0, userName: "" });
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Reset password untuk <strong>{resetDialog.userName}</strong>
          </p>
          <div className="space-y-1.5">
            <Label>Password Baru *</Label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="min. 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPassword((v) => !v)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialog({ open: false, userId: 0, userName: "" })}
            >
              Batal
            </Button>
            <Button
              disabled={newPassword.length < 6 || resetPassword.isPending}
              onClick={() =>
                resetPassword.mutate({ id: resetDialog.userId, newPassword })
              }
            >
              {resetPassword.isPending ? "Mereset..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
