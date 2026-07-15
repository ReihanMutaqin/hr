import { useState } from "react";
import { useParams } from "react-router";
import { Briefcase, MapPin, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractTextFromPDF } from "@/lib/pdf";

export default function CandidatePortal() {
  const { id } = useParams<{ id: string }>();
  const jobId = parseInt(id || "0", 10);

  const { data: job, isLoading, error } = trpc.recruitment.publicJob.useQuery({ id: jobId }, {
    enabled: !!jobId && !isNaN(jobId),
    retry: false,
  });

  const apply = trpc.recruitment.publicApplyJob.useMutation({
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (e) => {
      toast.error(e.message);
    }
  });

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;
  }

  if (error || !job) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <Briefcase className="h-12 w-12 text-slate-300 mb-4" />
        <h1 className="text-xl font-bold text-slate-800">Lowongan Tidak Ditemukan</h1>
        <p className="mt-2 text-slate-500">Lowongan mungkin sudah ditutup atau link tidak valid.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800">Lamaran Terkirim!</h1>
        <p className="mt-2 text-slate-500 max-w-md">
          Terima kasih telah melamar untuk posisi <strong>{job.title}</strong>. Tim HR kami akan meninjau profil Anda dan segera menghubungi Anda.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Silakan unggah CV Anda");
    
    setIsExtracting(true);
    let cvText = "";
    let cvFileBase64: string | undefined = undefined;

    const fileToBase64 = (f: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });

    try {
      cvText = await extractTextFromPDF(file);
      cvFileBase64 = await fileToBase64(file);
    } catch (err: any) {
      setIsExtracting(false);
      return toast.error(err.message || "Gagal membaca PDF");
    }

    if (cvText.length < 20) {
      setIsExtracting(false);
      return toast.error("Teks CV terlalu pendek atau file PDF berupa gambar (scanned). Mohon gunakan PDF berbasis teks.");
    }

    apply.mutate({
      jobId,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      cvText,
      cvFileBase64,
    });
    setIsExtracting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        
        {/* Job Details Header */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{job.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5 font-medium bg-slate-100 px-3 py-1 rounded-full">
              <Briefcase className="h-4 w-4" />
              {job.departmentName || "General"} · {job.employmentType}
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="h-4 w-4" />
              {job.location}
            </span>
          </div>
          
          <div className="mt-8 prose prose-slate max-w-none">
            <h3 className="text-lg font-semibold text-slate-900">Deskripsi Pekerjaan</h3>
            <p className="whitespace-pre-wrap mt-2">{job.description}</p>
            
            {job.requirements && (
              <>
                <h3 className="text-lg font-semibold text-slate-900 mt-6">Persyaratan</h3>
                <p className="whitespace-pre-wrap mt-2">{job.requirements}</p>
              </>
            )}
          </div>
        </div>

        {/* Application Form */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Lamar Posisi Ini</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap *</Label>
                <Input
                  id="fullName"
                  required
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="phone">Nomor Telepon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cv">Upload CV (PDF) *</Label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileText className="w-8 h-8 mb-3 text-slate-400" />
                      {file ? (
                        <p className="mb-2 text-sm text-slate-700 font-semibold">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                      ) : (
                        <>
                          <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Klik untuk upload</span> atau drag and drop</p>
                          <p className="text-xs text-slate-500">PDF (Maksimal 3MB)</p>
                        </>
                      )}
                    </div>
                    <input 
                      id="dropzone-file" 
                      type="file" 
                      accept="application/pdf" 
                      className="hidden" 
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > 3 * 1024 * 1024) return toast.error("Ukuran file maksimal 3MB");
                          if (f.type !== "application/pdf") return toast.error("Hanya menerima format PDF");
                          setFile(f);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700" 
              disabled={isExtracting || apply.isPending}
            >
              {(isExtracting || apply.isPending) ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memproses Lamaran...</>
              ) : (
                "Kirim Lamaran"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
