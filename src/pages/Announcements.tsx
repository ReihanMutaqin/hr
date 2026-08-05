import { useState } from "react";
import { Plus, Megaphone, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/format";

export default function Announcements() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "hr";
  const utils = trpc.useUtils();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", pinned: false });

  const { data: announcements, isLoading } = trpc.misc.announcements.useQuery();

  const create = trpc.misc.createAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman dipublikasikan");
      setDialog(false);
      utils.misc.announcements.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.misc.deleteAnnouncement.useMutation({
    onSuccess: () => {
      toast.success("Pengumuman dihapus");
      utils.misc.announcements.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengumuman</h1>
          <p className="text-sm text-muted-foreground">Informasi resmi untuk seluruh karyawan</p>
        </div>
        {isManager && (
          <Button
            onClick={() => {
              setForm({ title: "", content: "", pinned: false });
              setDialog(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Buat Pengumuman
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : (announcements ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Megaphone className="h-10 w-10" />
            <p className="text-sm">Belum ada pengumuman</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {announcements?.map((a) => (
            <Card key={a.id} className={a.pinned ? "border-blue-200 bg-blue-50/40" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {a.pinned && <Pin className="h-4 w-4 text-blue-600" />}
                    {a.title}
                  </CardTitle>
                  {isManager && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400"
                      onClick={() => {
                        if (confirm("Hapus pengumuman ini?")) remove.mutate({ id: a.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Badge variant="outline" className="w-fit text-[11px]">
                  {formatDateTime(a.createdAt)}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Pengumuman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Judul *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Isi *</Label>
              <Textarea
                rows={5}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.pinned}
                onCheckedChange={(v) => setForm((f) => ({ ...f, pinned: v }))}
              />
              <Label>Sematkan di atas</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button
              disabled={!form.title.trim() || !form.content.trim() || create.isPending}
              onClick={() => create.mutate(form)}
            >
              Publikasikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
