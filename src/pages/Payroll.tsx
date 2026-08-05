import { useState, useRef } from "react";
import { 
  Wallet, 
  Play, 
  CheckCheck, 
  Receipt, 
  Banknote, 
  Info, 
  Printer, 
  FileText, 
  Download, 
  Building2, 
  CheckCircle2,
  Eye,
  ShieldCheck,
  Building
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { formatRupiah, formatDateTime, formatDate, statusLabel, statusVariant } from "@/lib/format";

function terbilang(n: number): string {
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  n = Math.floor(Math.abs(n));
  if (n < 12) return angka[n];
  if (n < 20) return terbilang(n - 10) + " Belas";
  if (n < 100) return terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
  if (n < 200) return "Seratus " + terbilang(n - 100);
  if (n < 1000) return terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
  if (n < 2000) return "Seribu " + terbilang(n - 1000);
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
  return formatRupiah(n);
}

export default function Payroll() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "hr";
  const utils = trpc.useUtils();
  const currentPeriod = new Date().toISOString().slice(0, 7);
  const [period, setPeriod] = useState(currentPeriod);
  const [filterPeriod, setFilterPeriod] = useState("all");
  
  // Selected Payslip for Modal & PDF Download
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);

  const { data: slips, isLoading } = trpc.payroll.list.useQuery(
    filterPeriod !== "all" ? { period: filterPeriod } : undefined,
  );
  const { data: periods } = trpc.payroll.periods.useQuery();
  const { data: summary } = trpc.payroll.summary.useQuery(
    filterPeriod !== "all" ? { period: filterPeriod } : undefined,
  );

  const invalidate = () => {
    utils.payroll.list.invalidate();
    utils.payroll.periods.invalidate();
    utils.payroll.summary.invalidate();
  };

  const generate = trpc.payroll.generate.useMutation({
    onSuccess: (r) => {
      toast.success(`Payroll dibuat: ${r.created} slip baru dari ${r.total} karyawan`);
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const markPaid = trpc.payroll.markPaid.useMutation({
    onSuccess: () => { toast.success("Ditandai dibayar"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const markAllPaid = trpc.payroll.markAllPaid.useMutation({
    onSuccess: () => { toast.success("Semua slip periode ini dibayar"); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Handle Professional PDF Download / Print Window
  const handleDownloadPdf = (slip: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak PDF. Izinkan izin pop-up browser Anda.");
      return;
    }

    const todayStr = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const periodStr = new Date(slip.period + "-01").toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });

    const grossSalary = slip.baseSalary + slip.allowance + slip.overtime + slip.bonus;
    const totalDeductions = slip.deduction + slip.tax;
    const netSalary = slip.netSalary;
    const terbilangText = terbilang(netSalary);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>Slip Gaji ${slip.employeeName} - ${periodStr}</title>
          <style>
            @page { size: A4; margin: 12mm 15mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 20px;
              font-size: 11px;
              line-height: 1.5;
              background: #fff;
            }
            .payslip-container {
              max-width: 800px;
              margin: 0 auto;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 28px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .header-kop {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0b1329;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .brand-logo {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .brand-icon {
              width: 42px;
              height: 42px;
              background: linear-gradient(135deg, #2563eb, #1d4ed8);
              color: #ffffff;
              border-radius: 10px;
              font-size: 24px;
              font-weight: 900;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
            }
            .brand-title {
              font-size: 20px;
              font-weight: 800;
              color: #0b1329;
              letter-spacing: -0.5px;
            }
            .brand-address {
              font-size: 10px;
              color: #64748b;
              margin-top: 2px;
            }
            .doc-info {
              text-align: right;
            }
            .doc-info h2 {
              margin: 0;
              font-size: 18px;
              font-weight: 800;
              color: #2563eb;
              letter-spacing: -0.5px;
            }
            .doc-info p {
              margin: 2px 0 0 0;
              font-size: 11px;
              color: #475569;
              font-weight: 600;
            }
            .badge-status {
              display: inline-block;
              margin-top: 6px;
              padding: 3px 10px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .badge-paid { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-draft { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }

            .emp-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 14px 18px;
              margin-bottom: 20px;
            }
            .info-group {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .info-label { color: #64748b; font-weight: 500; }
            .info-val { color: #0f172a; font-weight: 700; }

            .section-title {
              font-size: 12px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .breakdown-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .breakdown-table th {
              background: #0b1329;
              color: #ffffff;
              padding: 10px 14px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .breakdown-table th.right { text-align: right; }
            .breakdown-table td {
              padding: 9px 14px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 11px;
              color: #334155;
            }
            .breakdown-table td.right { text-align: right; font-weight: 600; }
            .breakdown-table tr.total-row td {
              background: #f1f5f9;
              font-weight: 800;
              color: #0f172a;
              border-top: 1px solid #cbd5e1;
              border-bottom: 2px solid #cbd5e1;
            }

            .net-banner {
              background: linear-gradient(135deg, #059669, #047857);
              color: #ffffff;
              border-radius: 12px;
              padding: 18px 24px;
              margin-bottom: 24px;
              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
            }
            .net-flex {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .net-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; }
            .net-amount { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
            .terbilang-box {
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px solid rgba(255, 255, 255, 0.2);
              font-size: 11px;
              font-style: italic;
              opacity: 0.95;
            }

            .signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              margin-top: 36px;
              padding-top: 16px;
            }
            .sig-box {
              text-align: center;
            }
            .sig-title { font-size: 10px; font-weight: 600; color: #64748b; margin-bottom: 8px; }
            .sig-space {
              height: 55px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .stamp-badge {
              border: 2px dashed #059669;
              color: #059669;
              padding: 4px 12px;
              border-radius: 8px;
              font-weight: 800;
              font-size: 10px;
              text-transform: uppercase;
              transform: rotate(-3deg);
            }
            .sig-name { font-size: 12px; font-weight: 800; color: #0f172a; text-decoration: underline; }
            .sig-role { font-size: 10px; color: #64748b; }

            .footer-disclaimer {
              margin-top: 36px;
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
              font-size: 9px;
              color: #94a3b8;
              text-align: center;
              line-height: 1.4;
            }

            @media print {
              body { padding: 0; }
              .payslip-container { border: none; box-shadow: none; padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            
            <!-- Header KOP Perusahaan -->
            <div class="header-kop">
              <div class="brand-logo">
                <div class="brand-icon">P</div>
                <div>
                  <div class="brand-title">Phoenix System</div>
                  <div class="brand-address">PT PHOENIX SISTEM INDONESIA • Enterprise HR & Payroll Division</div>
                  <div class="brand-address">Menara Phoenix Lt. 18, Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan 12190</div>
                </div>
              </div>
              <div class="doc-info">
                <h2>SLIP GAJI KARYAWAN</h2>
                <p>PERIODE: ${periodStr.toUpperCase()}</p>
                <div class="badge-status ${slip.status === 'paid' ? 'badge-paid' : 'badge-draft'}">
                  ${slip.status === 'paid' ? 'LUNAS / DIBAYAR' : 'DRAFT PAYROLL'}
                </div>
              </div>
            </div>

            <!-- Grid Data Karyawan -->
            <div class="emp-grid">
              <div class="info-group">
                <div class="info-row">
                  <span class="info-label">Nama Karyawan:</span>
                  <span class="info-val">${slip.employeeName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">NIK Karyawan:</span>
                  <span class="info-val">${slip.employeeNo}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Departemen:</span>
                  <span class="info-val">Operational & HR</span>
                </div>
              </div>
              <div class="info-group">
                <div class="info-row">
                  <span class="info-label">Metode Pembayaran:</span>
                  <span class="info-val">Transfer Bank BCA</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Tanggal Ditransfer:</span>
                  <span class="info-val">${slip.paidAt ? formatDate(slip.paidAt) : todayStr}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Status Hubungan:</span>
                  <span class="info-val">Karyawan Tetap</span>
                </div>
              </div>
            </div>

            <!-- Tabel Rincian Komponen Gaji -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              
              <!-- Pendapatan -->
              <div>
                <div class="section-title" style="color: #1e40af;">I. PENERIMAAN (EARNINGS)</div>
                <table class="breakdown-table">
                  <thead>
                    <tr>
                      <th>Komponen</th>
                      <th class="right">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Gaji Pokok</td>
                      <td class="right">${formatRupiah(slip.baseSalary)}</td>
                    </tr>
                    <tr>
                      <td>Tunjangan Jabatan (10%)</td>
                      <td class="right">${formatRupiah(slip.allowance)}</td>
                    </tr>
                    <tr>
                      <td>Uang Lembur & Bonus</td>
                      <td class="right">${formatRupiah(slip.overtime + slip.bonus)}</td>
                    </tr>
                    <tr class="total-row">
                      <td>Total Penerimaan Kotor</td>
                      <td class="right">${formatRupiah(grossSalary)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Potongan -->
              <div>
                <div class="section-title" style="color: #991b1b;">II. PEMOTONGAN (DEDUCTIONS)</div>
                <table class="breakdown-table">
                  <thead>
                    <tr>
                      <th>Komponen</th>
                      <th class="right">Jumlah (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Potongan Absensi (Prorata)</td>
                      <td class="right" style="color: #dc2626;">-${formatRupiah(slip.deduction)}</td>
                    </tr>
                    <tr>
                      <td>Pajak PPh 21 (5%)</td>
                      <td class="right" style="color: #d97706;">-${formatRupiah(slip.tax)}</td>
                    </tr>
                    <tr>
                      <td>&nbsp;</td>
                      <td class="right">&nbsp;</td>
                    </tr>
                    <tr class="total-row">
                      <td>Total Pemotongan</td>
                      <td class="right" style="color: #dc2626;">-${formatRupiah(totalDeductions)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>

            <!-- Banner Gaji Bersih -->
            <div class="net-banner">
              <div class="net-flex">
                <div>
                  <div class="net-label">TOTAL GAJI BERSIH DITERIMA (TAKE HOME PAY)</div>
                  <div style="font-size: 10px; opacity: 0.9;">Gaji Kotor - Total Pemotongan</div>
                </div>
                <div class="net-amount">${formatRupiah(netSalary)}</div>
              </div>
              <div class="terbilang-box">
                Terbilang: # ${terbilangText} Rupiah #
              </div>
            </div>

            <!-- Pengesahan & Tanda Tangan -->
            <div class="signatures">
              <div class="sig-box">
                <div class="sig-title">Penerima Gaji,</div>
                <div class="sig-space"></div>
                <div class="sig-name">${slip.employeeName}</div>
                <div class="sig-role">NIK: ${slip.employeeNo}</div>
              </div>
              <div class="sig-box">
                <div class="sig-title">Jakarta, ${todayStr}</div>
                <div class="sig-title">Head of HR & Finance Department,</div>
                <div class="sig-space">
                  <div class="stamp-badge">VERIFIED & PAID • PHX</div>
                </div>
                <div class="sig-name">Financial Controller</div>
                <div class="sig-role">PT Phoenix Sistem Indonesia</div>
              </div>
            </div>

            <!-- Footer Disclaimer -->
            <div class="footer-disclaimer">
              Dokumen ini diterbitkan secara sah dan otomatis oleh sistem penggajian terpadu <strong>Phoenix System (PT Phoenix Sistem Indonesia)</strong>.<br>
              Informasi yang tercantum di dalam slip gaji ini bersifat RAHASIA (CONFIDENTIAL) dan hanya diperuntukkan bagi pemilik akun yang bersangkutan.
            </div>

          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5 w-full min-w-0 overflow-x-hidden">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs w-full min-w-0 overflow-hidden">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">Penggajian (Payroll)</h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Penggajian otomatis berbasis absensi (potongan proporsional, tunjangan 10%, PPh21 5%)
          </p>
        </div>

        {isManager && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full sm:w-auto shrink-0">
            <div className="space-y-1 flex-1 sm:flex-none">
              <Label className="text-xs">Periode</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full sm:w-[170px] rounded-xl text-xs" />
            </div>
            <Button 
              onClick={() => generate.mutate({ period })} 
              disabled={generate.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-11 sm:h-10 text-xs shadow-md"
            >
              <Play className="mr-2 h-4 w-4" />
              {generate.isPending ? "Memproses..." : "Generate Payroll"}
            </Button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 w-full min-w-0">
        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Total Gaji Bersih</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 truncate">{formatRupiah(Number(summary?.totals.totalNet ?? 0))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Total Pajak (PPh21)</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 truncate">{formatRupiah(Number(summary?.totals.totalTax ?? 0))}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex items-center gap-3.5 p-4 sm:p-5">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">Jumlah Slip</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{summary?.totals.count ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs w-full min-w-0 overflow-hidden">
        <div className="w-full sm:w-auto">
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-full sm:w-[200px] rounded-xl text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Semua Periode</SelectItem>
              {periods?.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isManager && filterPeriod !== "all" && (
          <Button variant="outline" size="sm" className="rounded-xl border-slate-200 text-xs h-10 sm:h-9" onClick={() => markAllPaid.mutate({ period: filterPeriod })}>
            <CheckCheck className="mr-2 h-4 w-4" /> Tandai Semua Dibayar
          </Button>
        )}
      </div>

      {!isManager && (
        <Alert className="bg-blue-50/60 text-slate-900 border-blue-100 rounded-2xl p-4">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <AlertTitle className="text-blue-900 font-semibold text-xs sm:text-sm">Informasi Komponen Gaji</AlertTitle>
          <AlertDescription className="text-xs text-slate-700 mt-2 space-y-1.5 leading-relaxed">
            <p><strong>Tunjangan (Allowance):</strong> 10% tetap dari Gaji Pokok.</p>
            <p><strong>Potongan (Deduction):</strong> Dihitung prorata jika Anda memiliki catatan tidak hadir di luar status 'Hadir' (Present) dan 'Terlambat' (Late) berdasar asumsi 22 hari kerja.</p>
            <p><strong>Pajak (PPh21):</strong> 5% flat dari Gaji Kotor (Pokok + Tunjangan - Potongan).</p>
          </AlertDescription>
        </Alert>
      )}

      {/* MOBILE LIST VIEW (For Smartphone Screens) */}
      <div className="block md:hidden space-y-3 w-full min-w-0">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-900">Daftar Slip Gaji</h2>
          <span className="text-xs text-slate-400 font-medium">({slips?.length ?? 0} Slip)</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Memuat slip gaji...
          </div>
        ) : (slips ?? []).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Belum ada slip gaji{isManager ? " — klik Generate Payroll untuk membuat" : ""}
          </div>
        ) : (
          slips?.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 w-full min-w-0 overflow-hidden">
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{s.employeeName}</p>
                  <p className="text-xs text-slate-400">{s.employeeNo} • Periode {s.period}</p>
                </div>
                <Badge variant={statusVariant(s.status)} className="capitalize text-[10px] px-2 py-0.5 shrink-0">
                  {statusLabel(s.status)}
                  {s.paidAt && <span className="ml-1 opacity-70">· {formatDateTime(s.paidAt).split(",")[0]}</span>}
                </Badge>
              </div>

              {/* Total Net Salary Highlight Card */}
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900">Gaji Bersih Diterima:</span>
                <span className="text-base font-extrabold text-emerald-700">{formatRupiah(s.netSalary)}</span>
              </div>

              {/* Salary Components Breakdown Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-500">Gaji Pokok</span>
                  <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(s.baseSalary)}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-500">Tunjangan (10%)</span>
                  <p className="font-bold text-slate-800 mt-0.5">{formatRupiah(s.allowance + s.overtime + s.bonus)}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-rose-600">Potongan Absensi</span>
                  <p className="font-bold text-rose-600 mt-0.5">-{formatRupiah(s.deduction)}</p>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-amber-600">Pajak PPh21 (5%)</span>
                  <p className="font-bold text-amber-600 mt-0.5">-{formatRupiah(s.tax)}</p>
                </div>
              </div>

              {/* Action Buttons for Mobile */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => setSelectedSlip(s)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs h-9"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Lihat Slip Proper
                </Button>
                <Button
                  onClick={() => handleDownloadPdf(s)}
                  variant="secondary"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs h-9 border border-slate-200"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                </Button>
              </div>

              {isManager && s.status === "draft" && (
                <Button 
                  onClick={() => markPaid.mutate({ id: s.id })} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs h-9 mt-1"
                >
                  <CheckCheck className="mr-1.5 h-4 w-4" /> Tandai Lunas / Dibayar
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW */}
      <Card className="hidden md:block border-slate-200 shadow-xs overflow-hidden w-full min-w-0">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">Slip Gaji Karyawan</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">Periode</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Karyawan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Pokok</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Tunjangan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Potongan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Pajak</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Gaji Bersih</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Aksi & Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-slate-400 font-medium">
                    Memuat slip gaji...
                  </TableCell>
                </TableRow>
              ) : (
                slips?.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="whitespace-nowrap font-medium text-slate-800 text-xs">{s.period}</TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-900 text-xs">{s.employeeName}</p>
                      <p className="text-[11px] text-slate-400">{s.employeeNo}</p>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs font-medium text-slate-800">{formatRupiah(s.baseSalary)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs text-slate-700">
                      {formatRupiah(s.allowance + s.overtime + s.bonus)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs font-medium text-rose-600">
                      -{formatRupiah(s.deduction)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-xs font-medium text-amber-600">
                      -{formatRupiah(s.tax)}
                    </TableCell>
                    <TableCell className="text-right font-extrabold whitespace-nowrap text-xs text-emerald-700">
                      {formatRupiah(s.netSalary)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)} className="capitalize text-xs">
                        {statusLabel(s.status)}
                        {s.paidAt && <span className="ml-1 opacity-70">· {formatDateTime(s.paidAt).split(",")[0]}</span>}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                          onClick={() => setSelectedSlip(s)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Slip
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-slate-200 text-slate-700 font-semibold rounded-lg"
                          onClick={() => handleDownloadPdf(s)}
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-blue-600" />
                        </Button>
                        {isManager && s.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-600 hover:text-emerald-700 h-8 w-8"
                            title="Tandai dibayar"
                            onClick={() => markPaid.mutate({ id: s.id })}
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && (slips ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-xs text-slate-400 font-medium">
                    Belum ada slip gaji{isManager ? " — klik Generate Payroll untuk membuat" : ""}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PROPER EXECUTIVE PAYSLIP MODAL */}
      {selectedSlip && (
        <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlip(null)}>
          <DialogContent className="max-w-2xl w-[95%] rounded-2xl p-4 sm:p-8 max-h-[95vh] overflow-y-auto">
            <DialogHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> Slip Gaji Resmi (Official Payslip)
              </DialogTitle>
            </DialogHeader>

            {/* FORMAL EXECUTIVE PAYSLIP DOCUMENT PREVIEW */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-8 space-y-6 shadow-sm font-sans text-slate-900">
              
              {/* KOP Perusahaan */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-tr from-blue-600 to-blue-700 text-white font-black text-2xl rounded-xl flex items-center justify-center shadow-md">
                    P
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Phoenix System</h2>
                    <p className="text-[11px] font-bold text-slate-600">PT PHOENIX SISTEM INDONESIA</p>
                    <p className="text-[10px] text-slate-400">Menara Phoenix Lt. 18, Jl. Jend. Sudirman, Jakarta Selatan 12190</p>
                  </div>
                </div>

                <div className="sm:text-right space-y-1">
                  <Badge variant={statusVariant(selectedSlip.status)} className="capitalize text-xs px-2.5 py-0.5">
                    {statusLabel(selectedSlip.status)}
                  </Badge>
                  <p className="text-xs font-mono font-bold text-slate-700">NO: SLIP/PHX/{selectedSlip.period}/00{selectedSlip.id}</p>
                  <p className="text-[11px] text-slate-500 font-semibold">Periode: {selectedSlip.period}</p>
                </div>
              </div>

              {/* Data Karyawan & Pembayaran Grid */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Nama Karyawan:</span><span className="font-bold text-slate-900">{selectedSlip.employeeName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">NIK Karyawan:</span><span className="font-bold text-slate-900">{selectedSlip.employeeNo}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Departemen:</span><span className="font-bold text-slate-900">Operational & HR</span></div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Metode Pembayaran:</span><span className="font-bold text-slate-900">Transfer Bank BCA</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Tanggal Transfer:</span><span className="font-bold text-slate-900">{selectedSlip.paidAt ? formatDate(selectedSlip.paidAt) : "Proses Payroll"}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-medium">Status Hubungan:</span><span className="font-bold text-slate-900">Karyawan Tetap</span></div>
                </div>
              </div>

              {/* Tabel Rincian Penerimaan & Pemotongan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Penerimaan */}
                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-blue-600" /> I. Penerimaan (Earnings)
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <div className="flex justify-between p-2.5 bg-slate-50 border-b border-slate-100 font-semibold text-slate-600">
                      <span>Komponen</span><span>Jumlah</span>
                    </div>
                    <div className="p-2.5 space-y-2">
                      <div className="flex justify-between"><span>Gaji Pokok</span><span className="font-medium">{formatRupiah(selectedSlip.baseSalary)}</span></div>
                      <div className="flex justify-between"><span>Tunjangan (10%)</span><span className="font-medium">{formatRupiah(selectedSlip.allowance)}</span></div>
                      <div className="flex justify-between"><span>Lembur & Bonus</span><span className="font-medium">{formatRupiah(selectedSlip.overtime + selectedSlip.bonus)}</span></div>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-100 font-bold text-slate-900 border-t border-slate-200">
                      <span>Gaji Kotor (Gross)</span><span>{formatRupiah(selectedSlip.baseSalary + selectedSlip.allowance + selectedSlip.overtime + selectedSlip.bonus)}</span>
                    </div>
                  </div>
                </div>

                {/* Pemotongan */}
                <div className="space-y-2">
                  <h3 className="text-xs font-extrabold text-rose-900 uppercase tracking-wider flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5 text-rose-600" /> II. Pemotongan (Deductions)
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <div className="flex justify-between p-2.5 bg-slate-50 border-b border-slate-100 font-semibold text-slate-600">
                      <span>Komponen</span><span>Jumlah</span>
                    </div>
                    <div className="p-2.5 space-y-2">
                      <div className="flex justify-between"><span>Potongan Absensi</span><span className="font-medium text-rose-600">-{formatRupiah(selectedSlip.deduction)}</span></div>
                      <div className="flex justify-between"><span>Pajak PPh 21 (5%)</span><span className="font-medium text-amber-600">-{formatRupiah(selectedSlip.tax)}</span></div>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-100 font-bold text-rose-700 border-t border-slate-200">
                      <span>Total Pemotongan</span><span>-{formatRupiah(selectedSlip.deduction + selectedSlip.tax)}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Total Gaji Bersih Banner */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">TOTAL GAJI BERSIH DITERIMA (TAKE HOME PAY)</span>
                  <span className="text-xl sm:text-2xl font-black">{formatRupiah(selectedSlip.netSalary)}</span>
                </div>
                <div className="pt-2 border-t border-emerald-500/40 text-xs italic text-emerald-50 leading-tight">
                  Terbilang: # {terbilang(selectedSlip.netSalary)} Rupiah #
                </div>
              </div>

              {/* Tanda Tangan & Legalisasi */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 text-xs">
                <div className="text-center space-y-8">
                  <span className="text-slate-500 font-medium block">Penerima Gaji,</span>
                  <p className="font-bold text-slate-900 underline">{selectedSlip.employeeName}</p>
                </div>
                <div className="text-center space-y-3">
                  <span className="text-slate-500 font-medium block">Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <div className="inline-block border-2 border-dashed border-emerald-600 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase rotate-[-2deg]">
                    VERIFIED & PAID • PHX
                  </div>
                  <p className="font-bold text-slate-900 underline block pt-1">PT Phoenix Sistem Indonesia</p>
                </div>
              </div>

            </div>

            <DialogFooter className="pt-3 flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => handleDownloadPdf(selectedSlip)} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" /> Download PDF / Cetak Slip
              </Button>
              <Button variant="outline" className="rounded-xl w-full sm:w-auto" onClick={() => setSelectedSlip(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
