import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, Award } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const LEVELS = ["Intern", "Junior", "Mid", "Senior", "Lead", "Manager", "Director"] as const;

export default function Organization() {
  const utils = trpc.useUtils();
  const { data: departments } = trpc.org.departments.useQuery();
  const { data: positions } = trpc.org.positions.useQuery();

  // Department dialog state
  const [deptDialog, setDeptDialog] = useState(false);
  const [deptEdit, setDeptEdit] = useState<{ id: number; name: string; description: string } | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");

  // Position dialog state
  const [posDialog, setPosDialog] = useState(false);
  const [posEdit, setPosEdit] = useState<number | null>(null);
  const [posTitle, setPosTitle] = useState("");
  const [posDept, setPosDept] = useState("");
  const [posLevel, setPosLevel] = useState<(typeof LEVELS)[number]>("Junior");

  const invalidate = () => {
    utils.org.departments.invalidate();
    utils.org.positions.invalidate();
  };

  const createDept = trpc.org.createDepartment.useMutation({
    onSuccess: () => { toast.success("Departemen ditambahkan"); setDeptDialog(false); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateDept = trpc.org.updateDepartment.useMutation({
    onSuccess: () => { toast.success("Departemen diperbarui"); setDeptDialog(false); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteDept = trpc.org.deleteDepartment.useMutation({
    onSuccess: () => { toast.success("Departemen dihapus"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const createPos = trpc.org.createPosition.useMutation({
    onSuccess: () => { toast.success("Jabatan ditambahkan"); setPosDialog(false); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updatePos = trpc.org.updatePosition.useMutation({
    onSuccess: () => { toast.success("Jabatan diperbarui"); setPosDialog(false); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deletePos = trpc.org.deletePosition.useMutation({
    onSuccess: () => { toast.success("Jabatan dihapus"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const openDeptDialog = (dept?: { id: number; name: string; description: string | null }) => {
    if (dept) {
      setDeptEdit({ id: dept.id, name: dept.name, description: dept.description ?? "" });
      setDeptName(dept.name);
      setDeptDesc(dept.description ?? "");
    } else {
      setDeptEdit(null);
      setDeptName("");
      setDeptDesc("");
    }
    setDeptDialog(true);
  };

  const openPosDialog = (pos?: { id: number; title: string; departmentId: number | null; level: (typeof LEVELS)[number] }) => {
    if (pos) {
      setPosEdit(pos.id);
      setPosTitle(pos.title);
      setPosDept(pos.departmentId ? String(pos.departmentId) : "");
      setPosLevel(pos.level);
    } else {
      setPosEdit(null);
      setPosTitle("");
      setPosDept("");
      setPosLevel("Junior");
    }
    setPosDialog(true);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Struktur Organisasi</h1>
        <p className="text-sm text-muted-foreground">Kelola departemen dan jabatan perusahaan</p>
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">
            <Building2 className="mr-2 h-4 w-4" /> Departemen
          </TabsTrigger>
          <TabsTrigger value="positions">
            <Award className="mr-2 h-4 w-4" /> Jabatan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openDeptDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Departemen
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {departments?.map((d) => (
              <Card key={d.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{d.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeptDialog(d)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => {
                        if (confirm(`Hapus departemen "${d.name}"?`)) deleteDept.mutate({ id: d.id });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="min-h-[40px] text-sm text-muted-foreground">
                    {d.description || "Tidak ada deskripsi"}
                  </p>
                  <Badge variant="secondary" className="mt-3">
                    {d.employeeCount} karyawan
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openPosDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Jabatan
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.level}</Badge>
                      </TableCell>
                      <TableCell>{p.departmentName ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openPosDialog(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => {
                              if (confirm(`Hapus jabatan "${p.title}"?`)) deletePos.mutate({ id: p.id });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department dialog */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deptEdit ? "Edit Departemen" : "Tambah Departemen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Departemen *</Label>
              <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Input value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialog(false)}>Batal</Button>
            <Button
              disabled={!deptName.trim() || createDept.isPending || updateDept.isPending}
              onClick={() =>
                deptEdit
                  ? updateDept.mutate({ id: deptEdit.id, name: deptName, description: deptDesc })
                  : createDept.mutate({ name: deptName, description: deptDesc })
              }
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position dialog */}
      <Dialog open={posDialog} onOpenChange={setPosDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{posEdit ? "Edit Jabatan" : "Tambah Jabatan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Jabatan *</Label>
              <Input value={posTitle} onChange={(e) => setPosTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Departemen</Label>
              <Select value={posDept} onValueChange={setPosDept}>
                <SelectTrigger><SelectValue placeholder="Pilih departemen" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={posLevel} onValueChange={(v) => setPosLevel(v as (typeof LEVELS)[number])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosDialog(false)}>Batal</Button>
            <Button
              disabled={!posTitle.trim() || createPos.isPending || updatePos.isPending}
              onClick={() =>
                posEdit
                  ? updatePos.mutate({
                      id: posEdit,
                      title: posTitle,
                      departmentId: posDept ? Number(posDept) : null,
                      level: posLevel,
                    })
                  : createPos.mutate({
                      title: posTitle,
                      departmentId: posDept ? Number(posDept) : undefined,
                      level: posLevel,
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
