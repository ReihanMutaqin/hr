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
  Zap
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
    const text = `Lowongan Pekerjaan: ${job.title} di ${job.departmentName || "NexusHR"}. Lamar sekarang di ${window.location.href}`;
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
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">Memuat Informasi Lowongan...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Briefcase className="h-8 w-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Lowongan Tidak Ditemukan</h1>
        <p className="mt-2 text-slate-500 max-w-sm">
          Posisi pekerjaan ini mungkin sudah ditutup, diarsipkan, atau tautan tidak valid.
        </p>
        <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700" onClick={() => window.location.reload()}>
          Coba Muat Ulang
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-xl w-full p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Lamaran Berhasil Terkirim!</h1>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Terima kasih telah melamar posisi <strong className="text-indigo-600 font-semibold">{job.title}</strong> di NexusHR.
          </p>

          <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-left space-y-3">
            <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Nama Pelamar:</span>
              <span className="font-semibold text-slate-800">{form.fullName}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Email Kontak:</span>
              <span className="font-semibold text-slate-800">{form.email}</span>
            </div>
            <div className="flex justify-between text-sm py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Departemen:</span>
              <span className="font-semibold text-slate-800">{job.departmentName || "Umum"}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-slate-500">Status Proses:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs">
                <CheckCircle2 className="w-3 h-3" /> Dalam Peninjauan HR
              </span>
            </div>
          </div>

          <div className="mt-8 text-left bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-indigo-600" /> Tahap Selanjutnya
            </h4>
            <ul className="text-xs text-indigo-800 space-y-1.5 list-disc list-inside">
              <li>Tim Talent Acquisition NexusHR akan meninjau profil & CV Anda.</li>
              <li>Tim HR akan mengonfirmasi berkas Anda dalam 1–3 hari kerja.</li>
              <li>Undangan seleksi berikutnya akan dikirimkan langsung ke email Anda.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" className="rounded-xl border-slate-300" onClick={handleCopyLink}>
              {copiedLink ? <Check className="w-4 h-4 mr-2 text-emerald-600" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiedLink ? "Link Tersalin" : "Bagikan Info Lowongan"}
            </Button>
            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold" onClick={() => window.location.reload()}>
              Selesai & Tutup
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-800">
      
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-200">
              N
            </div>
            <div>
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">Nexus<span className="text-indigo-600">HR</span></span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                Career Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden sm:flex rounded-lg border-slate-200 text-slate-700" onClick={handleCopyLink}>
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
              {copiedLink ? "Tersalin" : "Salin Link"}
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg border-slate-200 text-slate-700" onClick={handleShareWhatsApp}>
              <Share2 className="w-3.5 h-3.5 sm:mr-1.5 text-emerald-600" />
              <span className="hidden sm:inline">Bagikan</span>
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-medium shadow-xs" onClick={scrollToForm}>
              Lamar Sekarang
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Job Header Hero Card */}
        <section className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-10">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-50/80 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Menerima Lamaran (Aktif)</span>
              </span>

              <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Dipublikasikan {new Date(job.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {job.title}
              </h1>
              <p className="text-slate-500 font-medium text-sm sm:text-base">
                Bergabunglah dengan tim profesional di departemen <span className="text-slate-800 font-semibold">{job.departmentName || "Umum"}</span>.
              </p>
            </div>

            {/* Quick Badges Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Tipe Pekerjaan</p>
                  <p className="text-sm font-bold text-slate-800 capitalize">{job.employmentType}</p>
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Lokasi Kerja</p>
                  <p className="text-sm font-bold text-slate-800">{job.location || "Jakarta"}</p>
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Kisaran Gaji</p>
                  <p className="text-sm font-bold text-slate-800">
                    {job.salaryMin > 0 && job.salaryMax > 0 
                      ? `${formatIDR(job.salaryMin)} - ${formatIDR(job.salaryMax)}`
                      : "Kompetitif"}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400">Departemen</p>
                  <p className="text-sm font-bold text-slate-800">{job.departmentName || "General"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Layout Grid: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Job Content & Application Form */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Job Description Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b pb-4 border-slate-100">
                <FileText className="w-5 h-5 text-indigo-600" />
                Deskripsi Pekerjaan
              </h2>
              <div className="text-slate-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                {job.description}
              </div>

              {job.requirements && (
                <>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b pb-4 pt-4 border-slate-100">
                    <Award className="w-5 h-5 text-indigo-600" />
                    Persyaratan & Kualifikasi
                  </h2>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                    {job.requirements}
                  </div>
                </>
              )}

              {/* Perks & Benefits Section */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <HeartHandshake className="w-5 h-5 text-indigo-600" />
                  Benefit & Fasilitas Perusahaan
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Asuransi Kesehatan & BPJS Ketenagakerjaan lengkap</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Perangkat kerja modern (Laptop & Perlengkapan pendukung)</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Jam kerja fleksibel & budaya kerja kolaboratif</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Budget pengembangan skill, sertifikasi, & pelatihan profesional</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Application Form Card */}
            <div ref={formRef} className="bg-white rounded-3xl border border-indigo-100 shadow-md p-6 sm:p-8 space-y-6 scroll-mt-20">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs uppercase tracking-wider mb-1">
                  Formulir Pendaftaran Resmi
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Lamar Posisi Ini</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Lengkapi informasi data diri dan unggah CV PDF Anda untuk diproses oleh tim rekrutmen NexusHR.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" /> Nama Lengkap *
                    </Label>
                    <Input
                      id="fullName"
                      required
                      placeholder="Contoh: Budi Santoso"
                      className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-500" /> Email Aktif *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="budi@example.com"
                      className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  {/* Phone / WhatsApp */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-indigo-500" /> Nomor Telepon / WhatsApp *
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      placeholder="081234567890"
                      className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>

                  {/* Current Company */}
                  <div className="space-y-2">
                    <Label htmlFor="currentCompany" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Perusahaan / Posisi Saat Ini (Opsional)
                    </Label>
                    <Input
                      id="currentCompany"
                      placeholder="PT Maju Bersama / Senior Dev"
                      className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
                      value={form.currentCompany}
                      onChange={(e) => setForm((f) => ({ ...f, currentCompany: e.target.value }))}
                    />
                  </div>

                  {/* Portfolio / LinkedIn */}
                  <div className="space-y-2">
                    <Label htmlFor="portfolioUrl" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-500" /> Link Portofolio / LinkedIn / GitHub (Opsional)
                    </Label>
                    <Input
                      id="portfolioUrl"
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
                      value={form.portfolioUrl}
                      onChange={(e) => setForm((f) => ({ ...f, portfolioUrl: e.target.value }))}
                    />
                  </div>

                  {/* Expected Salary */}
                  <div className="space-y-2">
                    <Label htmlFor="expectedSalary" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-indigo-500" /> Ekspektasi Gaji per Bulan (Rp) (Opsional)
                    </Label>
                    <Input
                      id="expectedSalary"
                      type="number"
                      placeholder="12000000"
                      className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 h-11"
                      value={form.expectedSalary}
                      onChange={(e) => setForm((f) => ({ ...f, expectedSalary: e.target.value }))}
                    />
                  </div>

                </div>

                {/* Cover Letter */}
                <div className="space-y-2">
                  <Label htmlFor="coverLetter" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" /> Catatan Singkat / Cover Letter (Opsional)
                  </Label>
                  <Textarea
                    id="coverLetter"
                    rows={3}
                    placeholder="Ceritakan secara singkat keahlian utama Anda dan mengapa Anda tertarik dengan posisi ini..."
                    className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    value={form.coverLetter}
                    onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))}
                  />
                </div>

                {/* Upload CV Dropzone */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-indigo-500" /> Unggah Dokumen CV (PDF) *
                    </span>
                    <span className="text-xs font-normal text-slate-400">Maks. 5MB</span>
                  </Label>

                  {!file ? (
                    <label 
                      htmlFor="cv-upload"
                      className="group flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl cursor-pointer transition-all p-6 text-center"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 group-hover:scale-110 transition-transform flex items-center justify-center text-indigo-600 mb-3">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        Klik untuk memilih file CV atau drag & drop di sini
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Format file harus berupa <span className="font-semibold text-indigo-600">PDF berbasis teks</span>.
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
                    <div className="border border-indigo-200 bg-indigo-50/50 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                          PDF
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 truncate max-w-xs sm:max-w-sm">{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            {isExtracting ? (
                              <span className="text-indigo-600 font-medium flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" /> Membaca Teks PDF...
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
                        className="text-slate-400 hover:text-red-500 rounded-xl"
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
                <div className="flex items-start gap-2.5 pt-2">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-600 cursor-pointer leading-relaxed">
                    Saya menyatakan bahwa seluruh data dan dokumen yang saya unggah adalah asli, benar, dan dapat dipertanggungjawabkan untuk keperluan rekrutmen.
                  </label>
                </div>

                {/* Submit Action Button */}
                <Button
                  type="submit"
                  disabled={isExtracting || apply.isPending || !file}
                  className="w-full h-13 text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl shadow-lg shadow-indigo-200 transition-all"
                >
                  {isExtracting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Memeriksa Berkas CV...
                    </span>
                  ) : apply.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Mengirimkan Lamaran...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Kirim Lamaran Sekarang <Send className="w-4 h-4 ml-1" />
                    </span>
                  )}
                </Button>
              </form>
            </div>

          </div>

          {/* Right Column: Sidebar Info & Help */}
          <aside className="space-y-6">
            
            {/* Quick Sticky Card */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Ringkasan Posisi</h3>
              
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Departemen</span>
                  <span className="font-semibold text-slate-800">{job.departmentName || "Umum"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Tipe Pekerjaan</span>
                  <span className="font-semibold text-slate-800 capitalize">{job.employmentType}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Lokasi</span>
                  <span className="font-semibold text-slate-800">{job.location || "Jakarta"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Sistem Kerja</span>
                  <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">Hybrid / Onsite</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500">Waktu Respon HR</span>
                  <span className="font-semibold text-emerald-600">1 - 3 Hari Kerja</span>
                </div>
              </div>

              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-xl" onClick={scrollToForm}>
                Lamar Posisi Ini <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Hiring Process Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-md">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-400" /> Proses Rekrutmen
              </div>
              <h3 className="font-bold text-lg leading-tight">4 Langkah Seleksi Mudah</h3>
              
              <div className="space-y-4 text-xs text-slate-300 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-400 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-white">Upload CV PDF</p>
                    <p className="text-slate-400 mt-0.5">Kirim berkas & informasi data diri Anda.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-400 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-white">Screening Berkas & Profil</p>
                    <p className="text-slate-400 mt-0.5">Tim HR memverifikasi kualifikasi & kecocokan pengalaman Anda.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-400 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-white">Wawancara HR & User</p>
                    <p className="text-slate-400 mt-0.5">Diskusi mendalam mengenai pengalaman & kecocokan budaya.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/30 border border-indigo-400 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                    4
                  </div>
                  <div>
                    <p className="font-semibold text-white">Offering Letter</p>
                    <p className="text-slate-400 mt-0.5">Penawaran resmi bergabung dalam keluarga besar NexusHR.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Privacy & Security Badge */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 space-y-3">
              <div className="flex items-center gap-2.5 text-slate-800 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Bebas Biaya & Aman
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seluruh proses pendaftaran di NexusHR <strong className="text-slate-700">100% gratis</strong>. Kami menjaga ketat kerahasiaan data pribadi Anda sesuai dengan standar keamanan data internasional.
              </p>
            </div>

          </aside>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">NexusHR</span>
            <span>• Modern HR Career Platform</span>
          </div>
          <p>© {new Date().getFullYear()} NexusHR System. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
