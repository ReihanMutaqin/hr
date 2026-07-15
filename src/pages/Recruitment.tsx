import { useState } from "react";
import {
  Plus,
  Sparkles,
  Briefcase,
  MapPin,
  Users as UsersIcon,
  Pencil,
  Trash2,
  CalendarPlus,
  Trophy,
  Medal,
  Award,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import { formatRupiah, formatDate, statusLabel, statusVariant } from "@/lib/format";

const CANDIDATE_STATUSES = ["new", "screening", "interview", "offer", "hired", "rejected"] as const;
const JOB_STATUSES = ["open", "closed", "draft"] as const;
const EMP_TYPES = ["full-time", "part-time", "contract", "internship"] as const;

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-orange-600" />;
  return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
}

export default function Recruitment() {
  const utils = trpc.useUtils();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobDialog, setJobDialog] = useState(false);
  const [candDialog, setCandDialog] = useState(false);
  const [interviewDialog, setInterviewDialog] = useState<number | null>(null);
  const [rankingDialog, setRankingDialog] = useState(false);
  
  const [aiOpinionDialog, setAiOpinionDialog] = useState<{
    open: boolean;
    candidateName: string;
    opinion: string;
  } | null>(null);

  const [jobForm, setJobForm] = useState({
    title: "",
    departmentId: "",
    description: "",
    requirements: "",
    employmentType: "full-time" as (typeof EMP_TYPES)[number],
    location: "Jakarta",
    salaryMin: "",
    salaryMax: "",
    status: "open" as (typeof JOB_STATUSES)[number],
  });
  const [editJobId, setEditJobId] = useState<number | null>(null);

  const [candForm, setCandForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    cvText: "",
    source: "Website",
  });

  const [interviewForm, setInterviewForm] = useState({
    interviewerName: "",
    scheduledAt: "",
    location: "Online (Google Meet)",
    notes: "",
  });

  const { data: jobs, isLoading } = trpc.recruitment.jobs.useQuery();
  const { data: departments } = trpc.org.departments.useQuery();
  const { data: candidates } = trpc.recruitment.candidates.useQuery(
    selectedJobId ? { jobId: selectedJobId } : undefined,
  );

  const invalidateAll = () => {
    utils.recruitment.jobs.invalidate();
    utils.recruitment.candidates.invalidate();
  };

  const createJob = trpc.recruitment.createJob.useMutation({
    onSuccess: () => { toast.success("Lowongan dibuat"); setJobDialog(false); invalidateAll(); },
    onError: (e) => toast.error(e.message),
  });
  const updateJob = trpc.recruitment.updateJob.useMutation({
    onSuccess: () => { toast.success("Lowongan diperbarui"); setJobDialog(false); invalidateAll(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteJob = trpc.recruitment.deleteJob.useMutation({
    onSuccess: () => { toast.success("Lowongan dihapus"); setSelectedJobId(null); invalidateAll(); },
    onError: (e) => toast.error(e.message),
  });
  const createCandidate = trpc.recruitment.createCandidate.useMutation({
    onSuccess: () => { toast.success("Kandidat ditambahkan"); setCandDialog(false); invalidateAll(); },
    onError: (e) => toast.error(e.message),
  });
  const updateStatus = trpc.recruitment.updateCandidateStatus.useMutation({
    onSuccess: () => { toast.success("Status diperbarui"); invalidateAll(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCandidate = trpc.recruitment.deleteCandidate.useMutation({
    onSuccess: () => { toast.success("Kandidat dihapus"); invalidateAll(); },
    onError: (e) => toast.error(e.message),
  });
  const createInterview = trpc.recruitment.createInterview.useMutation({
    onSuccess: () => { toast.success("Interview dijadwalkan"); setInterviewDialog(null); invalidateAll(); },
    onError: (e) => toast.error(e.message),
  });

  const [expandedReasoningId, setExpandedReasoningId] = useState<number | null>(null);

  const [ranking, setRanking] = useState<{
    jobTitle: string;
    model: string;
    fallback: boolean;
    results: Array<{
      rank: number;
      score: number;
      reasoning?: string;
      candidate: {
        id: number;
        fullName: string;
        email: string;
        phone: string | null;
        cvText: string;
        status: string;
      };
    }>;
  } | null>(null);

  const rerank = trpc.recruitment.rerankCandidates.useMutation({
    onSuccess: (data) => {
      setRanking(data);
      setRankingDialog(true);
      invalidateAll();
      toast.success(
        data.fallback
          ? "Rerank selesai (mode fallback keyword)"
          : `Rerank AI selesai — ${data.model.split("/").pop()}`,
      );
    },
    onError: (e) => toast.error(e.message),
  });

  const evaluateAI = trpc.recruitment.evaluateCandidateAI.useMutation({
    onSuccess: (data, variables) => {
      invalidateAll();
      const cand = candidates?.find(c => c.id === variables.candidateId);
      if (cand) {
        setAiOpinionDialog({
          open: true,
          candidateName: cand.fullName,
          opinion: data.opinion,
        });
      }
      toast.success("Analisis CV selesai!");
    },
    onError: (e) => toast.error(e.message),
  });

  const selectedJob = jobs?.find((j) => j.id === selectedJobId);

  const openJobDialog = (job?: NonNullable<typeof jobs>[number]) => {
    if (job) {
      setEditJobId(job.id);
      setJobForm({
        title: job.title,
        departmentId: job.departmentId ? String(job.departmentId) : "",
        description: job.description,
        requirements: job.requirements ?? "",
        employmentType: job.employmentType,
        location: job.location,
        salaryMin: String(job.salaryMin),
        salaryMax: String(job.salaryMax),
        status: job.status,
      });
    } else {
      setEditJobId(null);
      setJobForm({
        title: "",
        departmentId: "",
        description: "",
        requirements: "",
        employmentType: "full-time",
        location: "Jakarta",
        salaryMin: "",
        salaryMax: "",
        status: "open",
      });
    }
    setJobDialog(true);
  };

  const submitJob = () => {
    const payload = {
      title: jobForm.title,
      departmentId: jobForm.departmentId ? Number(jobForm.departmentId) : undefined,
      description: jobForm.description,
      requirements: jobForm.requirements || undefined,
      employmentType: jobForm.employmentType,
      location: jobForm.location,
      salaryMin: Number(jobForm.salaryMin) || 0,
      salaryMax: Number(jobForm.salaryMax) || 0,
      status: jobForm.status,
    };
    if (editJobId) updateJob.mutate({ id: editJobId, ...payload });
    else createJob.mutate(payload);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rekrutmen & AI Screening</h1>
          <p className="text-sm text-muted-foreground">
            Kelola lowongan dan peringkat kandidat otomatis dengan AI rerank
          </p>
        </div>
        <Button onClick={() => openJobDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Buat Lowongan
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Job list */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)
          ) : (
            jobs?.map((job) => (
              <Card
                key={job.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  selectedJobId === job.id && "ring-2 ring-indigo-500",
                )}
                onClick={() => setSelectedJobId(job.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold leading-tight">
                        <span className="text-muted-foreground font-normal text-xs mr-2 border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50">ID: {job.id}</span>
                        {job.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{job.departmentName ?? "-"}</p>
                    </div>
                    <Badge variant={statusVariant(job.status)}>{statusLabel(job.status)}</Badge>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-3 w-3" /> {job.candidateCount} kandidat
                    </span>
                  </div>
                  {job.salaryMax > 0 && (
                    <p className="mt-1.5 text-xs font-medium text-emerald-600">
                      {formatRupiah(job.salaryMin)} – {formatRupiah(job.salaryMax)}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
          {!isLoading && (jobs ?? []).length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <Briefcase className="h-8 w-8" />
                <p className="text-sm">Belum ada lowongan</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Candidate panel */}
        <div className="space-y-4">
          {!selectedJob ? (
            <Card className="flex h-full min-h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Briefcase className="h-10 w-10" />
                <p className="text-sm">Pilih lowongan untuk melihat kandidat</p>
              </div>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>
                        <span className="text-muted-foreground font-normal text-sm mr-2 border border-slate-200 px-2 py-0.5 rounded bg-slate-50">ID: {selectedJob.id}</span>
                        {selectedJob.title}
                      </CardTitle>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground line-clamp-2">
                        {selectedJob.description}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openJobDialog(selectedJob)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500"
                        onClick={() => {
                          if (confirm(`Hapus lowongan "${selectedJob.title}" beserta kandidatnya?`))
                            deleteJob.mutate({ id: selectedJob.id });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      onClick={() => rerank.mutate({ jobId: selectedJob.id })}
                      disabled={rerank.isPending || selectedJob.candidateCount === 0}
                      className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {rerank.isPending ? "AI sedang menganalisis CV..." : "Rerank Kandidat dengan AI"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCandForm({ fullName: "", email: "", phone: "", cvText: "", source: "Website" });
                        setCandDialog(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Tambah Kandidat
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kandidat</TableHead>
                        <TableHead className="hidden md:table-cell">Sumber</TableHead>
                        <TableHead className="hidden md:table-cell">Melamar</TableHead>
                        <TableHead>Skor AI</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[90px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(candidates ?? []).map((cand) => (
                        <TableRow key={cand.id}>
                          <TableCell>
                            <p className="font-medium">{cand.fullName}</p>
                            <p className="text-xs text-muted-foreground">{cand.email}</p>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm">{cand.source ?? "-"}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm">
                            {formatDate(cand.appliedAt)}
                          </TableCell>
                          <TableCell>
                            {cand.aiScore ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge className="bg-indigo-600 w-fit cursor-pointer hover:bg-indigo-700 transition-colors">
                                    <Sparkles className="mr-1 h-3 w-3" />
                                    {Number(cand.aiScore).toFixed(0)}
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4 text-sm whitespace-pre-wrap">
                                  <span className="font-semibold block mb-2 text-indigo-800 border-b pb-1">Kesimpulan Rerank AI</span>
                                  {cand.aiNote || "Tidak ada kesimpulan tersimpan."}
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <span className="text-xs text-muted-foreground">belum</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={cand.status}
                              onValueChange={(v) =>
                                updateStatus.mutate({
                                  id: cand.id,
                                  status: v as (typeof CANDIDATE_STATUSES)[number],
                                })
                              }
                            >
                              <SelectTrigger className="h-8 w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CANDIDATE_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Minta Pendapat AI"
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                disabled={evaluateAI.isPending}
                                onClick={() => {
                                  if (cand.aiNote && !cand.aiNote.startsWith("AI rerank")) {
                                    // Sudah pernah dievaluasi lengkap
                                    setAiOpinionDialog({
                                      open: true,
                                      candidateName: cand.fullName,
                                      opinion: cand.aiNote,
                                    });
                                  } else {
                                    evaluateAI.mutate({ candidateId: cand.id });
                                  }
                                }}
                              >
                                <Bot className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Jadwalkan interview"
                                onClick={() => {
                                  setInterviewForm({
                                    interviewerName: "",
                                    scheduledAt: "",
                                    location: "Online (Google Meet)",
                                    notes: "",
                                  });
                                  setInterviewDialog(cand.id);
                                }}
                              >
                                <CalendarPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-500"
                                onClick={() => {
                                  if (confirm(`Hapus kandidat "${cand.fullName}"?`))
                                    deleteCandidate.mutate({ id: cand.id });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(candidates ?? []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                            Belum ada kandidat untuk lowongan ini
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* AI ranking dialog */}
      <Dialog open={rankingDialog} onOpenChange={setRankingDialog}>
        <DialogContent className="max-h-[90vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              Hasil AI Rerank — {ranking?.jobTitle}
            </DialogTitle>
            <DialogDescription>
              Kandidat diperingkat oleh{" "}
              {ranking?.fallback ? "fallback keyword" : "NVIDIA Llama Nemotron Rerank"} · skor 0–100
              relatif terhadap kandidat terbaik
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-3">
              {ranking?.results.map((r) => (
                <div key={r.candidate.id} className="rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex w-8 justify-center">
                      <RankIcon rank={r.rank} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{r.candidate.fullName}</p>
                      <p className="text-xs text-muted-foreground">{r.candidate.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                          style={{ width: `${Math.max(4, r.score)}%` }}
                        />
                      </div>
                      <Badge 
                        className="bg-indigo-600 w-12 justify-center cursor-pointer hover:bg-indigo-700 transition-colors"
                        onClick={() => setExpandedReasoningId(expandedReasoningId === r.candidate.id ? null : r.candidate.id)}
                      >
                        {r.score.toFixed(0)}
                      </Badge>
                    </div>
                  </div>
                  {expandedReasoningId === r.candidate.id && r.reasoning && (
                    <div className="mt-3 ml-11 rounded-md bg-indigo-50/50 p-3 text-sm text-indigo-900 border border-indigo-100/50 whitespace-pre-wrap">
                      <span className="font-semibold block mb-1 text-indigo-800">Kesimpulan AI:</span>
                      {r.reasoning}
                    </div>
                  )}
                  <p className="mt-2 line-clamp-2 pl-11 text-xs text-muted-foreground">
                    {r.candidate.cvText}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* AI Opinion Dialog */}
      <Dialog open={aiOpinionDialog?.open ?? false} onOpenChange={(open) => !open && setAiOpinionDialog(null)}>
        <DialogContent className="max-h-[85vh] sm:max-w-2xl flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-500" />
              Pendapat AI: {aiOpinionDialog?.candidateName}
            </DialogTitle>
            <DialogDescription>
              Analisis kualitatif kecocokan kandidat dengan lowongan ini.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4 mt-2">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {aiOpinionDialog?.opinion}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Job dialog */}
      <Dialog open={jobDialog} onOpenChange={setJobDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editJobId ? "Edit Lowongan" : "Buat Lowongan"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Judul Lowongan *</Label>
              <Input
                value={jobForm.title}
                onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Departemen</Label>
              <Select
                value={jobForm.departmentId}
                onValueChange={(v) => setJobForm((f) => ({ ...f, departmentId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {departments?.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <Select
                value={jobForm.employmentType}
                onValueChange={(v) => setJobForm((f) => ({ ...f, employmentType: v as typeof f.employmentType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMP_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lokasi</Label>
              <Input
                value={jobForm.location}
                onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={jobForm.status}
                onValueChange={(v) => setJobForm((f) => ({ ...f, status: v as typeof f.status }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gaji Min (Rp)</Label>
              <Input
                type="number"
                value={jobForm.salaryMin}
                onChange={(e) => setJobForm((f) => ({ ...f, salaryMin: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gaji Max (Rp)</Label>
              <Input
                type="number"
                value={jobForm.salaryMax}
                onChange={(e) => setJobForm((f) => ({ ...f, salaryMax: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Deskripsi *</Label>
              <Textarea
                rows={3}
                value={jobForm.description}
                onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Persyaratan</Label>
              <Textarea
                rows={3}
                value={jobForm.requirements}
                onChange={(e) => setJobForm((f) => ({ ...f, requirements: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobDialog(false)}>Batal</Button>
            <Button
              onClick={submitJob}
              disabled={!jobForm.title.trim() || !jobForm.description.trim() || createJob.isPending || updateJob.isPending}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidate dialog */}
      <Dialog open={candDialog} onOpenChange={setCandDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Tambah Kandidat</DialogTitle>
            <DialogDescription>Tempel teks CV/resume kandidat untuk dianalisis AI</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nama Lengkap *</Label>
                <Input
                  value={candForm.fullName}
                  onChange={(e) => setCandForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={candForm.email}
                  onChange={(e) => setCandForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telepon</Label>
                <Input
                  value={candForm.phone}
                  onChange={(e) => setCandForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sumber</Label>
                <Input
                  value={candForm.source}
                  onChange={(e) => setCandForm((f) => ({ ...f, source: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Teks CV / Resume *</Label>
              <Textarea
                rows={8}
                placeholder="Tempel seluruh isi CV kandidat di sini (pengalaman, skill, pendidikan)..."
                value={candForm.cvText}
                onChange={(e) => setCandForm((f) => ({ ...f, cvText: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCandDialog(false)}>Batal</Button>
            <Button
              disabled={
                !candForm.fullName.trim() ||
                !candForm.email.trim() ||
                candForm.cvText.trim().length < 10 ||
                createCandidate.isPending ||
                !selectedJobId
              }
              onClick={() =>
                selectedJobId &&
                createCandidate.mutate({
                  jobId: selectedJobId,
                  fullName: candForm.fullName,
                  email: candForm.email,
                  phone: candForm.phone || undefined,
                  cvText: candForm.cvText,
                  source: candForm.source,
                })
              }
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interview dialog */}
      <Dialog open={interviewDialog !== null} onOpenChange={(o) => !o && setInterviewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jadwalkan Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Pewawancara *</Label>
              <Input
                value={interviewForm.interviewerName}
                onChange={(e) => setInterviewForm((f) => ({ ...f, interviewerName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal & Waktu *</Label>
              <Input
                type="datetime-local"
                value={interviewForm.scheduledAt}
                onChange={(e) => setInterviewForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lokasi</Label>
              <Input
                value={interviewForm.location}
                onChange={(e) => setInterviewForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea
                rows={2}
                value={interviewForm.notes}
                onChange={(e) => setInterviewForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewDialog(null)}>Batal</Button>
            <Button
              disabled={
                !interviewForm.interviewerName.trim() ||
                !interviewForm.scheduledAt ||
                createInterview.isPending
              }
              onClick={() =>
                interviewDialog &&
                createInterview.mutate({
                  candidateId: interviewDialog,
                  interviewerName: interviewForm.interviewerName,
                  scheduledAt: new Date(interviewForm.scheduledAt).toISOString(),
                  location: interviewForm.location,
                  notes: interviewForm.notes || undefined,
                })
              }
            >
              Jadwalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
