import React, { useState, useRef } from "react";
import { useParams } from "react-router";
import { 
  Briefcase, 
  MapPin, 
  CheckCircle2, 
  FileText, 
  Loader2, 
  DollarSign, 
  Calendar, 
  Building2, 
  Share2, 
  Copy, 
  Check, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  ShieldCheck, 
  Clock, 
  Award, 
  HeartHandshake, 
  ArrowRight,
  UploadCloud,
  X,
  Send,
  Lock
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractTextFromPDF } from "@/lib/pdf";

export default function CandidatePortal() {
  const { id } = useParams<{ id: string }>();
  const jobId = parseInt(id || "0", 10);
  const formRef = useRef<HTMLDivElement>(null);

  const { data: job, isLoading, error } = trpc.recruitment.publicJob.useQuery(
    { id: jobId },
    {
      enabled: !!jobId && !isNaN(jobId),
      retry: false,
    }
  );

  const apply = trpc.recruitment.publicApplyJob.useMutation({
    onSuccess: () => {
      setSuccess(true);
      toast.success("Lamaran berhasil dikirim!");
    },
    onError: (e) => {
      toast.error(e.message || "Gagal mengirim lamaran");
    },
  });

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    currentCompany: "",
    portfolioUrl: "",
    expectedSalary: "",
    coverLetter: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [extractedWordCount, setExtractedWordCount] = useState<number>(0);
  const [extractedTextCache, setExtractedTextCache] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const isClosed = job?.status === "closed";

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    toast.success("Tautan lowongan berhasil disalin!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleShareWhatsApp = () => {
    if (!job) return;
    const text = `Lowongan Pekerjaan: ${job.title} di ${job.departmentName || "Phoenix System"}. Lihat detail di ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleFileChange = async (selectedFile: File) => {
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }
    if (selectedFile.type !== "application/pdf") {
      toast.error("Hanya mengizinkan dokumen berformat PDF");
      return;
    }

    setFile(selectedFile);
    setIsExtracting(true);
    setExtractSuccess(false);

    try {
      const cvText = await extractTextFromPDF(selectedFile);
      if (cvText.length < 20) {
        setFile(null);
        setIsExtracting(false);
        toast.error("Teks CV tidak terbaca. Mohon gunakan file PDF berbasis teks, bukan gambar/scan.");
        return;
      }
      setExtractedTextCache(cvText);
      const wordCount = cvText.trim().split(/\s+/).length;
      setExtractedWordCount(wordCount);
      setExtractSuccess(true);
      toast.success(`CV Berhasil Dibaca! (${wordCount} kata terdeteksi)`);
    } catch (err: any) {
      setFile(null);
      toast.error(err.message || "Gagal membaca PDF. Pastikan file tidak terkunci password.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isClosed) {
      return toast.error("Lowongan pekerjaan ini sudah ditutup.");
    }

    if (!file || !extractedTextCache) {
      return toast.error("Silakan unggah dokumen CV berformat PDF yang valid");
    }

    if (!agreeTerms) {
      return toast.error("Anda harus menyetujui pernyataan kebenaran data");
    }

    apply.mutate({
      jobId,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      currentCompany: form.currentCompany,
      portfolioUrl: form.portfolioUrl,
      expectedSalary: form.expectedSalary,
      coverLetter: form.coverLetter,
      cvText: extractedTextCache,
    });
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Memuat Informasi Lowongan...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
          <Briefcase className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Lowongan Tidak Ditemukan</h1>
        <p className="mt-2 text-slate-500 max-w-sm text-sm">
          Posisi pekerjaan ini mungkin sudah dihapus, diarsipkan, atau tautan tidak valid.
        </p>
        <Button className="mt-6 bg-blue-600 hover:bg-blue-700 rounded-xl" onClick={() => window.location.reload()}>
          Coba Muat Ulang
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-xl w-full p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Lamaran Berhasil Terkirim</h1>
          <p className="mt-2 text-slate-600 text-sm leading-relaxed">
            Terima kasih telah melamar posisi <strong className="text-slate-900 font-semibold">{job.title}</strong> di Phoenix System.
          </p>

          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-2.5">
            <div className="flex justify-between text-xs sm:text-sm py-1 border-b border-slate-200">
              <span className="text-slate-500">Nama Pelamar</span>
              <span className="font-semibold text-slate-800">{form.fullName}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm py-1 border-b border-slate-200">
              <span className="text-slate-500">Email Kontak</span>
              <span className="font-semibold text-slate-800">{form.email}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm py-1 border-b border-slate-200">
              <span className="text-slate-500">Departemen</span>
              <span className="font-semibold text-slate-800">{job.departmentName || "Umum"}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm py-1">
              <span className="text-slate-500">Status Tahap</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dalam Peninjauan HR
              </span>
            </div>
          </div>

          <div className="mt-6 text-left bg-blue-50/60 border border-blue-100 rounded-xl p-4">
            <h4 className="text-xs font-bold text-blue-900 flex items-center gap-2 mb-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> Tahap Selanjutnya
            </h4>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Tim Talent Acquisition akan meninjau profil & CV Anda.</li>
              <li>Tim HR akan mengonfirmasi berkas Anda dalam 1–3 hari kerja.</li>
              <li>Undangan seleksi berikutnya akan dikirimkan langsung ke email Anda.</li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" className="rounded-xl border-slate-300 text-slate-700" onClick={handleCopyLink}>
              {copiedLink ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copiedLink ? "Link Tersalin" : "Bagikan Info Lowongan"}
            </Button>
            <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-medium" onClick={() => window.location.reload()}>
              Selesai & Tutup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* Header Corporate Navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              P
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">Phoenix <span className="text-blue-600">System</span></span>
              <span className="hidden sm:inline-block ml-2.5 text-xs font-medium text-slate-500 border-l border-slate-200 pl-2.5">
                Portal Karir Resmi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex rounded-lg border-slate-200 text-slate-700" onClick={handleCopyLink}>
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copiedLink ? "Tersalin" : "Salin Link"}
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg border-slate-200 text-slate-700" onClick={handleShareWhatsApp}>
              <Share2 className="w-3.5 h-3.5 sm:mr-1.5 text-slate-600" />
              <span className="hidden sm:inline">Bagikan</span>
            </Button>
            {isClosed ? (
              <Button disabled size="sm" className="bg-slate-200 text-slate-500 rounded-lg cursor-not-allowed">
                Pendaftaran Ditutup
              </Button>
            ) : (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium shadow-xs" onClick={scrollToForm}>
                Lamar Sekarang
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* Job Header Card */}
        <section className="bg-white rounded-2xl border border-slate-200 border-t-4 border-t-blue-600 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {isClosed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Pendaftaran Ditutup</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Menerima Lamaran</span>
              </span>
            )}

            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Dipublikasikan {new Date(job.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {job.title}
            </h1>
            <p className="text-slate-600 text-sm">
              Departemen <span className="text-slate-900 font-semibold">{job.departmentName || "Umum"}</span> • {job.location || "Jakarta"}
            </p>
          </div>

          {/* Key Info Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Tipe Pekerjaan</p>
                <p className="text-sm font-semibold text-slate-800 capitalize">{job.employmentType}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Lokasi Kerja</p>
                <p className="text-sm font-semibold text-slate-800">{job.location || "Jakarta"}</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Kisaran Gaji</p>
                <p className="text-sm font-semibold text-slate-800">
                  {job.salaryMin > 0 && job.salaryMax > 0 
                    ? `${formatIDR(job.salaryMin)} - ${formatIDR(job.salaryMax)}`
                    : "Kompetitif"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Departemen</p>
                <p className="text-sm font-semibold text-slate-800">{job.departmentName || "General"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Layout Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Job Details & Form */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Job Description Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3 border-slate-100">
                <FileText className="w-4 h-4 text-blue-600" />
                Deskripsi Pekerjaan
              </h2>
              <div className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">
                {job.description}
              </div>

              {job.requirements && (
                <>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b pb-3 pt-3 border-slate-100">
                    <Award className="w-4 h-4 text-blue-600" />
                    Persyaratan & Kualifikasi
                  </h2>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">
                    {job.requirements}
                  </div>
                </>
              )}

              {/* Perks & Benefits Section */}
              <div className="pt-3 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <HeartHandshake className="w-4 h-4 text-blue-600" />
                  Fasilitas & Benefit
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Asuransi Kesehatan & BPJS lengkap</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Perangkat kerja modern & perlengkapan pendukung</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Jam kerja fleksibel & lingkungan profesional</span>
                  </div>
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Dukungan pengembangan karir & pelatihan profesional</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Form Card OR Closed Notice */}
            {isClosed ? (
              <div ref={formRef} className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-3 shadow-xs scroll-mt-20">
                <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900">Pendaftaran Ditutup</h2>
                  <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Terima kasih atas minat Anda. Pendaftaran untuk posisi <strong className="text-slate-900">{job.title}</strong> saat ini telah resmi ditutup.
                  </p>
                </div>
                <div className="pt-2 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <span>Detail lowongan di atas tetap dapat dibaca sebagai referensi.</span>
                </div>
              </div>
            ) : (
              <div ref={formRef} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs scroll-mt-20">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Formulir Lamaran Kerja</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Silakan isi informasi data diri dan unggah berkas CV PDF Anda secara lengkap.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Form Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-600" /> Nama Lengkap *
                      </Label>
                      <Input
                        id="fullName"
                        required
                        placeholder="Contoh: Budi Santoso"
                        className="rounded-lg border-slate-200 focus:border-blue-600 focus:ring-blue-600 h-10 text-sm"
                        value={form.fullName}
                        onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-blue-600" /> Email Aktif *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="budi@example.com"
                        className="rounded-lg border-slate-200 focus:border-blue-600 focus:ring-blue-600 h-10 text-sm"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>

                    {/* Phone / WhatsApp */}
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-blue-600" /> Nomor Telepon / WhatsApp *
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        required
                        placeholder="081234567890"
                        className="rounded-lg border-slate-200 focus:border-blue-600 focus:ring-blue-600 h-10 text-sm"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>

                    {/* Current Company */}
                    <div className="space-y-1.5">
                      <Label htmlFor="currentCompany" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" /> Perusahaan / Posisi saat ini (Opsional)
                      </Label>
                      <Input
                        id="currentCompany"
                        placeholder="PT Maju Bersama / Staff"
                        className="rounded-lg border-slate-200 focus:border-blue-600 focus:ring-blue-600 h-10 text-sm"
                        value={form.currentCompany}
                        onChange={(e) => setForm((f) => ({ ...f, currentCompany: e.target.value }))}
                      />
                    </div>

                    {/* Portfolio / LinkedIn */}
                    <div className="space-y-1.5">
                      <Label htmlFor="portfolioUrl" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-blue-600" /> Tautan Portofolio / LinkedIn (Opsional)
                      </Label>
                      <Input
                        id="portfolioUrl"
                        type="url"
                        placeholder="https://linkedin.com/in/username"
                        className="rounded-lg border-slate-200 focus:border-blue-600 focus:ring-blue-600 h-10 text-sm"
                        value={form.portfolioUrl}
                        onChange={(e) => setForm((f) => ({ ...f, portfolioUrl: e.target.value }))}
                      />
                    </div>

                    {/* Expected Salary */}
                    <div className="space-y-1.5">
                      <Label htmlFor="expectedSalary" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-blue-600" /> Ekspektasi Gaji per Bulan (Rp) (Opsional)
                      </Label>
                      <Input
                        id="expectedSalary"
                        type="number"
                        placeholder="10000000"
                        className="rounded-lg border-slate-200 focus:border-blue-600 focus:ring-blue-600 h-10 text-sm"
                        value={form.expectedSalary}
                        onChange={(e) => setForm((f) => ({ ...f, expectedSalary: e.target.value }))}
                      />
                    </div>

                  </div>

                  {/* Cover Letter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="coverLetter" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> Cover Letter / Catatan Tambahan (Opsional)
                    </Label>
                    <Textarea
                      id="coverLetter"
                      rows={3}
                      placeholder="Jelaskan secara ringkas pengalaman dan alasan Anda berminat..."
                      className="rounded-lg border-slate-200 focus:border-blue-600 focus:ring-blue-600 text-sm"
                      value={form.coverLetter}
                      onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))}
                    />
                  </div>

                  {/* Upload CV Dropzone */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <UploadCloud className="w-3.5 h-3.5 text-blue-600" /> Unggah File CV (PDF) *
                      </span>
                      <span className="text-xs font-normal text-slate-400">Maks. 5MB</span>
                    </Label>

                    {!file ? (
                      <label 
                        htmlFor="cv-upload"
                        className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 hover:border-blue-600 bg-slate-50 hover:bg-blue-50/30 rounded-xl cursor-pointer transition-all p-4 text-center"
                      >
                        <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-xs font-semibold text-slate-700">
                          Klik untuk memilih file CV atau drag & drop di sini
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Format PDF berbasis teks.
                        </p>
                        <input
                          id="cv-upload"
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileChange(f);
                          }}
                        />
                      </label>
                    ) : (
                      <div className="border border-slate-200 bg-slate-50 rounded-xl p-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            PDF
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-sm">{file.name}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              {isExtracting ? (
                                <span className="text-blue-600 font-medium flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Membaca PDF...
                                </span>
                              ) : extractSuccess ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> CV Terbaca ({extractedWordCount} kata)
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-red-500 rounded-lg h-8 w-8"
                          onClick={() => {
                            setFile(null);
                            setExtractSuccess(false);
                            setExtractedTextCache("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Consent Checkbox */}
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="terms" className="text-xs text-slate-600 cursor-pointer leading-normal">
                      Saya mengonfirmasi bahwa data dan berkas CV yang diisi adalah benar dan valid.
                    </label>
                  </div>

                  {/* Submit Action Button */}
                  <Button
                    type="submit"
                    disabled={isExtracting || apply.isPending || !file}
                    className="w-full h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
                  >
                    {isExtracting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Memeriksa Berkas CV...
                      </span>
                    ) : apply.isPending ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Mengirimkan Lamaran...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Kirim Lamaran Pekerjaan <Send className="w-4 h-4 ml-1" />
                      </span>
                    )}
                  </Button>
                </form>
              </div>
            )}

          </div>

          {/* Right Column: Sidebar Info */}
          <aside className="space-y-6">
            
            {/* Job Summary Sidebar Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Ringkasan Posisi</h3>
              
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Departemen</span>
                  <span className="font-semibold text-slate-800">{job.departmentName || "Umum"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Tipe Pekerjaan</span>
                  <span className="font-semibold text-slate-800 capitalize">{job.employmentType}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Lokasi</span>
                  <span className="font-semibold text-slate-800">{job.location || "Jakarta"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Status Pendaftaran</span>
                  <span className={`font-semibold px-2 py-0.5 rounded-md ${isClosed ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'}`}>
                    {isClosed ? 'Pendaftaran Ditutup' : 'Menerima Lamaran'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Waktu Respon HR</span>
                  <span className="font-semibold text-slate-800">1 - 3 Hari Kerja</span>
                </div>
              </div>

              {isClosed ? (
                <Button disabled className="w-full bg-slate-100 text-slate-400 font-medium rounded-xl cursor-not-allowed text-xs">
                  Pendaftaran Ditutup
                </Button>
              ) : (
                <Button className="w-full bg-blue-600 hover:bg-blue-700 font-medium rounded-xl text-xs" onClick={scrollToForm}>
                  Lamar Posisi Ini <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>

            {/* Selection Steps Card */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-xs">
              <h3 className="font-bold text-sm leading-tight text-white">4 Tahap Rekrutmen</h3>
              
              <div className="space-y-3.5 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Kirim Lamaran & CV</p>
                    <p className="text-slate-400 text-xs mt-0.5">Unggah CV PDF dan isi formulir data diri.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">Peninjauan Berkas HR</p>
                    <p className="text-slate-400 text-xs mt-0.5">Tim HR memeriksa kualifikasi & pengalaman.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">Wawancara HR & User</p>
                    <p className="text-slate-400 text-xs mt-0.5">Sesi wawancara teknis dan kesesuaian budaya.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-white">Penawaran Kerja</p>
                    <p className="text-slate-400 text-xs mt-0.5">Penyampaian Offering Letter resmi.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy Badge */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Bebas Biaya & Terjaga
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seluruh proses rekrutmen di Phoenix System <strong className="text-slate-700">100% bebas biaya</strong>. Data pribadi Anda dijaga secara aman.
              </p>
            </div>

          </aside>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Phoenix System</span>
            <span>• Portal Rekrutmen Resmi</span>
          </div>
          <p>© {new Date().getFullYear()} Phoenix System. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
