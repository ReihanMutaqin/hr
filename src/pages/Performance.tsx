import { useState } from "react";
import { Plus, BarChart3, TrendingUp, Trophy, Medal, Award, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { statusLabel, statusVariant } from "@/lib/format";

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-orange-600" />;
  return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
}

export default function Performance() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "hr";
  const utils = trpc.useUtils();
  const [periodFilter, setPeriodFilter] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [rankingDialog, setRankingDialog] = useState(false);
  const [criteria, setCriteria] = useState("");
  const [form, setForm] = useState({
    employeeId: "",
    reviewerName: "",
    period: `${new Date().getFullYear()}-Q2`,
    goals: "",
    achievements: "",
    reviewerScore: "75",
  });

  const { data: reviews, isLoading } = trpc.review.list.useQuery(
    periodFilter !== "all" ? { period: periodFilter } : undefined,
  );
  const { data: periods } = trpc.review.periods.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({}, { enabled: isManager });

  const invalidate = () => {
    utils.review.list.invalidate();
    utils.review.periods.invalidate();
  };

  const create = trpc.review.create.useMutation({
    onSuccess: () => { toast.success("Review ditambahkan"); setDialog(false); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.review.delete.useMutation({
    onSuccess: () => { toast.success("Review dihapus"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [ranking, setRanking] = useState<{
    model: string;
    fallback: boolean;
    results: Array<{
      rank: number;
      score: number;
      employeeName: string | null;
      review: { id: number; goals: string; achievements: string; period: string; reviewerScore: number };
    }>;
  } | null>(null);

  const aiRank = trpc.review.aiRank.useMutation({
    onSuccess: (data) => {
      setRanking(data);
      setRankingDialog(true);
      invalidate();
      toast.success(data.fallback ? "Ranking selesai (fallback keyword)" : "Ranking AI selesai — Nemotron");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Review</h1>
          <p className="text-sm text-muted-foreground">
            Penilaian kinerja & evaluasi kualifikasi pegawai
          </p>
        </div>
        {isManager && (
          <div className="flex gap-2">
            <Button
              onClick={() => aiRank.mutate({ period: periodFilter !== "all" ? periodFilter : undefined, criteria: criteria || undefined })}
              disabled={aiRank.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              {aiRank.isPending ? "Menganalisis..." : "Evaluasi Peringkat"}
            </Button>
            <Button variant="outline" onClick={() => setDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Tambah Review
            </Button>
          </div>
        )}
      </div>

      {isManager && (
        <Card className="bg-slate-50/80 border-slate-200">
          <CardContent className="p-3 text-xs flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">Kriteria Evaluasi Kinerja:</span>
            <input
              type="text"
              placeholder="Contoh: Produktivitas tinggi, kepemimpinan proyek, komunikasi (opsional)"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              className="flex-1 min-w-[260px] bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500"
            />
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Select value={periodFilter} onValueChange={setPeriodFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Periode</SelectItem>
            {periods?.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Karyawan</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead className="text-right">Skor Reviewer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : (reviews ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Belum ada review kinerja
                  </TableCell>
                </TableRow>
              ) : (
                    <TableCell className="text-center">
                      <Badge variant="outline">{r.reviewerScore}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.aiScore ? (
                        <Badge className="bg-indigo-600">
                          <Sparkles className="mr-1 h-3 w-3" />
                          {Number(r.aiScore).toFixed(0)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                    </TableCell>
                    {isManager && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => {
                            if (confirm("Hapus review ini?")) remove.mutate({ id: r.id });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
              {!isLoading && (reviews ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                    <TrendingUp className="mx-auto mb-2 h-8 w-8" />
                    Belum ada performance review
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Ranking dialog */}
      <Dialog open={rankingDialog} onOpenChange={setRankingDialog}>
        <DialogContent className="max-h-[90vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Peringkat Kinerja oleh AI
            </DialogTitle>
            <DialogDescription>
              Dianalisis dengan {ranking?.fallback ? "fallback keyword" : "NVIDIA Llama Nemotron Rerank"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-3">
              {ranking?.results.map((r) => (
                <div key={r.review.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex w-8 justify-center"><RankIcon rank={r.rank} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{r.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.review.period} · skor reviewer {r.review.reviewerScore}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                          style={{ width: `${Math.max(4, r.score)}%` }}
                        />
                      </div>
                      <Badge className="w-12 justify-center bg-indigo-600">{r.score.toFixed(0)}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 pl-11 text-xs text-muted-foreground">
                    {r.review.achievements}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Tambah Performance Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Karyawan *</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
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
                <Label>Reviewer *</Label>
                <Input
                  value={form.reviewerName}
                  onChange={(e) => setForm((f) => ({ ...f, reviewerName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Periode *</Label>
                <Input
                  value={form.period}
                  onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                  placeholder="2026-Q2"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Skor Reviewer (0-100) *</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.reviewerScore}
                  onChange={(e) => setForm((f) => ({ ...f, reviewerScore: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Goals *</Label>
              <Textarea
                rows={3}
                value={form.goals}
                onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Pencapaian *</Label>
              <Textarea
                rows={3}
                value={form.achievements}
                onChange={(e) => setForm((f) => ({ ...f, achievements: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Batal</Button>
            <Button
              disabled={
                !form.employeeId ||
                !form.reviewerName.trim() ||
                !form.goals.trim() ||
                !form.achievements.trim() ||
                create.isPending
              }
              onClick={() =>
                create.mutate({
                  employeeId: Number(form.employeeId),
                  reviewerName: form.reviewerName,
                  period: form.period,
                  goals: form.goals,
                  achievements: form.achievements,
                  reviewerScore: Number(form.reviewerScore) || 0,
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
