import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { UploadCloud, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { extractTextFromPDF } from "@/lib/pdf";
import { formatDate } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

function CvViewer({ candidateId, textFallback }: { candidateId: number; textFallback: string }) {
  const { data, isLoading } = trpc.recruitment.getCandidateFile.useQuery({ id: candidateId });

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" /> 
        <p>Sedang memuat dokumen...</p>
      </div>
    );
  }

  if (data?.cvFileBase64) {
    return (
      <div className="mt-2 h-[70vh] w-full rounded-md overflow-hidden border">
        <iframe 
          src={data.cvFileBase64} 
          className="w-full h-full border-0"
          title="CV Document"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto mt-2 pr-2">
      <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm border border-amber-200 mb-3">
        File asli PDF tidak tersimpan di database (kemungkinan file &gt; 3MB saat diunggah). Menampilkan teks hasil ekstraksi sebagai gantinya.
      </div>
      <div className="bg-slate-50 p-4 rounded-md border text-sm text-slate-800 whitespace-pre-wrap font-mono leading-relaxed">
        {textFallback || "Tidak ada teks CV yang tersimpan."}
      </div>
    </div>
  );
}

export default function Candidates() {
  const utils = trpc.useUtils();
  const { data: candidates, isLoading } = trpc.recruitment.candidates.useQuery();
  const { data: jobs } = trpc.recruitment.jobs.useQuery();

  const [batchDialog, setBatchDialog] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewCvDialog, setViewCvDialog] = useState<{ open: boolean; title: string; candidateId: number; textFallback: string } | null>(null);

  const batchCreate = trpc.recruitment.batchCreateCandidates.useMutation({
    onSuccess: (data) => {
      toast.success(`Berhasil memproses ${data.count} kandidat via Batch Upload!`);
      setBatchDialog(false);
      setFiles([]);
      setSelectedJobId("");
      utils.recruitment.candidates.invalidate();
      utils.recruitment.jobs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleBatchUpload = async () => {
    if (!selectedJobId) return toast.error("Pilih lowongan tujuan terlebih dahulu");
    if (files.length === 0) return toast.error("Pilih minimal 1 file PDF");

    setIsProcessing(true);
    setProgress(0);

    const candidatesPayload: { fullName: string; email: string; cvText: string; cvFileBase64?: string }[] = [];

    const fileToBase64 = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (e) => reject(e);
      });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await extractTextFromPDF(file);
        if (text.length > 20) {
          // A very basic regex to extract email
          const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
          const email = emailMatch ? emailMatch[1] : `candidate_${Date.now()}@example.com`;
          
          const fullName = file.name.replace(".pdf", "").replace(/[-_]/g, " ");

          let cvFileBase64: string | undefined = undefined;
          if (file.size <= 3 * 1024 * 1024) {
            try {
              cvFileBase64 = await fileToBase64(file);
            } catch (e) {
              console.error("Failed to read base64", e);
            }
          } else {
            toast.warning(`File ${file.name} > 3MB, PDF asli tidak disimpan, hanya teks yang diambil.`);
          }

          candidatesPayload.push({
            fullName,
            email,
            cvText: text,
            cvFileBase64,
          });
        }
      } catch (err: any) {
        toast.error(`Gagal memproses file ${file.name}: ${err.message}`);
      }
      setProgress(Math.round(((i + 1) / files.length) * 100));
    }

    if (candidatesPayload.length > 0) {
      batchCreate.mutate({
        jobId: Number(selectedJobId),
        candidates: candidatesPayload,
      });
    } else {
      toast.error("Tidak ada teks yang berhasil diekstrak dari file-file tersebut.");
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Kandidat & Batch Upload</h1>
          <p className="text-sm text-muted-foreground">
            Kelola master data kandidat atau unggah banyak CV PDF sekaligus
          </p>
        </div>
        <Button onClick={() => setBatchDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <UploadCloud className="mr-2 h-4 w-4" /> Batch Upload CV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kandidat</TableHead>
                <TableHead>Lowongan</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Tanggal Apply</TableHead>
                <TableHead>Skor AI</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                </TableRow>
              ) : candidates?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Belum ada data kandidat
                  </TableCell>
                </TableRow>
              ) : (
                candidates?.map((cand) => (
                  <TableRow key={cand.id}>
                    <TableCell>
                      <div className="font-medium">{cand.fullName}</div>
                      <div className="text-xs text-muted-foreground">{cand.email}</div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">{cand.jobTitle}</TableCell>
                    <TableCell className="text-sm">{cand.source ?? "-"}</TableCell>
                    <TableCell className="text-sm">{formatDate(cand.appliedAt)}</TableCell>
                    <TableCell>
                      {cand.aiScore ? (
                        <Badge className="bg-indigo-600 w-fit">
                          <Sparkles className="mr-1 h-3 w-3" />
                          {Number(cand.aiScore).toFixed(0)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">belum ada</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{cand.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => setViewCvDialog({ open: true, title: cand.fullName, candidateId: cand.id, textFallback: cand.cvText })}
                      >
                        <FileText className="h-4 w-4 mr-1" /> CV
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={batchDialog} onOpenChange={(v) => !isProcessing && setBatchDialog(v)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Batch Upload CV</DialogTitle>
            <DialogDescription>Unggah banyak file PDF sekaligus. Sistem akan otomatis mengekstrak teks CV dari PDF (maks 10MB per file) di browser Anda.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih Lowongan Tujuan</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lowongan..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs?.filter(j => j.status === "open").map(j => (
                    <SelectItem key={j.id} value={String(j.id)}>{j.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Pilih File PDF CV (Bisa lebih dari 1)</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 border-slate-300">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FileText className="w-8 h-8 mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500"><span className="font-semibold">Klik untuk upload</span></p>
                    <p className="text-xs text-slate-500">Maksimal 10MB per file PDF</p>
                  </div>
                  <input 
                    type="file" 
                    multiple
                    accept="application/pdf"
                    className="hidden" 
                    disabled={isProcessing}
                    onChange={(e) => {
                      if (e.target.files) {
                        const validFiles = Array.from(e.target.files).filter(f => f.size <= 10 * 1024 * 1024 && f.type === "application/pdf");
                        if (validFiles.length !== e.target.files.length) {
                          toast.error("Beberapa file diabaikan karena bukan PDF atau melebihi 10MB");
                        }
                        setFiles(validFiles);
                      }
                    }}
                  />
                </label>
              </div>
              {files.length > 0 && (
                <p className="text-sm text-emerald-600 font-medium">{files.length} file PDF siap diproses.</p>
              )}
            </div>

            {isProcessing && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between text-xs font-medium">
                  <span>Mengekstrak teks & memproses...</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialog(false)} disabled={isProcessing}>Batal</Button>
            <Button 
              onClick={handleBatchUpload}
              disabled={isProcessing || files.length === 0 || !selectedJobId || batchCreate.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isProcessing || batchCreate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
              Mulai Batch Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View CV Dialog */}
      <Dialog open={viewCvDialog?.open ?? false} onOpenChange={(open) => !open && setViewCvDialog(null)}>
        <DialogContent className="max-h-[90vh] sm:max-w-4xl flex flex-col w-full h-[85vh]">
          <DialogHeader>
            <DialogTitle>CV: {viewCvDialog?.title}</DialogTitle>
          </DialogHeader>
          {viewCvDialog && (
            <CvViewer candidateId={viewCvDialog.candidateId} textFallback={viewCvDialog.textFallback} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
