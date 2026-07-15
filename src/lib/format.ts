export function formatRupiah(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("id-ID").format(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export const STATUS_LABELS: Record<string, string> = {
  active: "Aktif",
  probation: "Percobaan",
  resigned: "Resign",
  terminated: "Terminasi",
  open: "Dibuka",
  closed: "Ditutup",
  draft: "Draft",
  new: "Baru",
  screening: "Screening",
  interview: "Interview",
  offer: "Offering",
  hired: "Diterima",
  rejected: "Ditolak",
  present: "Hadir",
  late: "Terlambat",
  absent: "Alpa",
  leave: "Cuti",
  sick: "Sakit",
  holiday: "Libur",
  pending: "Menunggu",
  approved: "Disetujui",
  paid: "Dibayar",
  submitted: "Terkirim",
  reviewed: "Direview",
  annual: "Cuti Tahunan",
  maternity: "Cuti Melahirkan",
  unpaid: "Tanpa Gaji",
  other: "Lainnya",
  pass: "Lulus",
  fail: "Gagal",
};

export function statusLabel(s: string | null | undefined): string {
  if (!s) return "-";
  return STATUS_LABELS[s] ?? s;
}

export function statusVariant(
  s: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "active":
    case "open":
    case "approved":
    case "present":
    case "paid":
    case "hired":
    case "pass":
    case "reviewed":
      return "default";
    case "late":
    case "pending":
    case "probation":
    case "offer":
    case "interview":
    case "screening":
    case "submitted":
    case "sick":
      return "secondary";
    case "rejected":
    case "absent":
    case "terminated":
    case "resigned":
    case "closed":
    case "fail":
      return "destructive";
    default:
      return "outline";
  }
}
