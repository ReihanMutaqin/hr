import React, { useState, useRef, useEffect } from "react";
import { 
  Clock, 
  LogIn, 
  LogOut, 
  CalendarCheck, 
  UserCheck, 
  UserX, 
  Plus, 
  Camera, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Eye,
  Navigation,
  Check,
  Sun,
  Sunset,
  Moon,
  AlertTriangle,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/hooks/useAuth";
import { formatTime, formatDate, statusLabel, statusVariant } from "@/lib/format";

const ATT_STATUSES = ["present", "late", "absent", "leave", "sick", "holiday"] as const;

type ShiftOption = "pagi" | "siang" | "malam";

const SHIFT_OPTIONS = [
  { id: "pagi", label: "Shift Pagi", hours: "08:00 – 16:00", icon: Sun, color: "text-amber-500 bg-amber-50 border-amber-200" },
  { id: "siang", label: "Shift Siang", hours: "16:00 – 00:00", icon: Sunset, color: "text-blue-500 bg-blue-50 border-blue-200" },
  { id: "malam", label: "Shift Malam", hours: "00:00 – 08:00", icon: Moon, color: "text-indigo-500 bg-indigo-50 border-indigo-200" },
] as const;

export default function Attendance() {
  const { user } = useAuth();
  const isManager = user?.role === "admin" || user?.role === "hr";
  const utils = trpc.useUtils();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [empFilter, setEmpFilter] = useState("all");
  
  // Manual Mark Dialog State
  const [markDialog, setMarkDialog] = useState(false);
  const [markForm, setMarkForm] = useState({
    employeeId: "",
    date: today,
    status: "present" as (typeof ATT_STATUSES)[number],
    notes: "",
  });

  // Camera & GPS Attendance Modal State
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [attendanceType, setAttendanceType] = useState<"checkIn" | "checkOut">("checkIn");
  const [selectedShift, setSelectedShift] = useState<ShiftOption>("pagi");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  // GPS State
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Detail Modal View State
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Camera Video Element Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const { data: records, isLoading } = trpc.attendance.list.useQuery({
    from,
    to,
    employeeId: isManager && empFilter !== "all" ? Number(empFilter) : undefined,
  });
  const { data: summary } = trpc.attendance.todaySummary.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({}, { enabled: isManager });

  const invalidate = () => {
    utils.attendance.list.invalidate();
    utils.attendance.todaySummary.invalidate();
  };

  const checkIn = trpc.attendance.checkIn.useMutation({
    onSuccess: (r) => {
      const lateMsg = r.lateDurationStr ? ` (${r.lateDurationStr})` : "";
      toast.success(
        r.status === "late" 
          ? `Check-in ${r.shiftName} dicatat${lateMsg}` 
          : `Check-in ${r.shiftName} berhasil (Tepat Waktu)`
      );
      closeCameraModal();
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const checkOut = trpc.attendance.checkOut.useMutation({
    onSuccess: () => { 
      toast.success("Check-out berhasil dicatat dengan Foto & GPS Alamat"); 
      closeCameraModal();
      invalidate(); 
    },
    onError: (e) => toast.error(e.message),
  });

  const mark = trpc.attendance.mark.useMutation({
    onSuccess: () => { toast.success("Absensi dicatat"); setMarkDialog(false); invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Start Camera and fetch GPS Location with Full Reverse Geocoding Address
  const startCameraAndGps = (type: "checkIn" | "checkOut") => {
    setAttendanceType(type);
    
    // Auto detect shift based on current time
    const currentHour = new Date().getHours();
    if (currentHour >= 6 && currentHour < 14) setSelectedShift("pagi");
    else if (currentHour >= 14 && currentHour < 22) setSelectedShift("siang");
    else setSelectedShift("malam");

    setCapturedPhoto(null);
    setGpsError(null);
    setGpsLoading(true);
    setCameraModalOpen(true);

    // 1. Fetch GPS Geolocation Coordinates
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setGpsLocation({
            lat,
            lng,
            address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
          });

          // 2. Fetch Full Human Readable Address via OpenStreetMap Nominatim Reverse Geocoding
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
              headers: { "Accept-Language": "id-ID,id;q=0.9" }
            });
            if (res.ok) {
              const geoData = await res.json();
              if (geoData && geoData.display_name) {
                setGpsLocation({
                  lat,
                  lng,
                  address: geoData.display_name,
                });
              }
            }
          } catch (err) {
            console.warn("Reverse geocoding error:", err);
          } finally {
            setGpsLoading(false);
          }
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setGpsError("GPS tidak dapat diakses. Pastikan izin lokasi aktif pada perangkat.");
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsError("Browser Anda tidak mendukung lokasi GPS.");
      setGpsLoading(false);
    }
  };

  // Attach webcam stream to video element
  useEffect(() => {
    if (cameraModalOpen && !capturedPhoto) {
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        .then((stream) => {
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          toast.error("Kamera tidak dapat diakses. Izinkan akses kamera pada browser Anda.");
        });
    }

    return () => {
      stopCamera();
    };
  }, [cameraModalOpen, capturedPhoto]);

  // Stop camera tracks
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Close camera modal
  const closeCameraModal = () => {
    stopCamera();
    setCameraModalOpen(false);
    setCapturedPhoto(null);
    setGpsLocation(null);
  };

  // Snap selfie frame
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, 320, 240);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      setCapturedPhoto(dataUrl);
      stopCamera(); // Stop camera live stream after snapshot
    }
  };

  // Retake snapshot
  const retakeSnapshot = () => {
    setCapturedPhoto(null);
  };

  // Submit Attendance Payload
  const submitAttendance = () => {
    if (!capturedPhoto) {
      toast.error("Silakan ambil foto selfie absensi terlebih dahulu.");
      return;
    }

    const payload = {
      shift: selectedShift,
      photoBase64: capturedPhoto,
      latitude: gpsLocation?.lat,
      longitude: gpsLocation?.lng,
      locationAddress: gpsLocation?.address || (gpsLocation?.lat ? `Lat: ${gpsLocation.lat}, Lng: ${gpsLocation.lng}` : undefined),
    };

    if (attendanceType === "checkIn") {
      checkIn.mutate(payload);
    } else {
      checkOut.mutate(payload);
    }
  };

  const statusCount = (s: string) => summary?.byStatus.find((x) => x.status === s)?.total ?? 0;

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 w-full min-w-0 overflow-x-hidden">
      
      {/* Mobile Optimized Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs w-full min-w-0 overflow-hidden">
        <div className="space-y-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight break-words">
            Presensi & Absensi Karyawan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed break-words">
            {isManager 
              ? "Kelola presensi seluruh karyawan berdasarkan shift kerja, foto selfie, & lokasi GPS" 
              : "Riwayat presensi kehadiran pribadi berbasis Shift Kerja, Foto Selfie, & Lokasi GPS"}
          </p>
        </div>

        {/* Action Buttons: Full width on mobile for easy thumb tapping */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
          {isManager && (
            <Button variant="outline" className="border-slate-200 text-slate-700 rounded-xl h-11 text-xs w-full sm:w-auto" onClick={() => setMarkDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Catat Manual HR
            </Button>
          )}
          {user?.employeeId && (
            <>
              <Button 
                onClick={() => startCameraAndGps("checkIn")} 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 h-12 sm:h-11 text-xs sm:text-xs w-full sm:w-auto"
              >
                <Camera className="mr-2 h-4 w-4 shrink-0" /> Absen Masuk (Foto & GPS)
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => startCameraAndGps("checkOut")} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold border border-slate-200 h-12 sm:h-11 text-xs sm:text-xs w-full sm:w-auto"
              >
                <LogOut className="mr-2 h-4 w-4 text-amber-600 shrink-0" /> Absen Keluar (Foto & GPS)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-4 w-full min-w-0">
        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-5 min-w-0">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <CalendarCheck className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Karyawan Aktif</p>
              <p className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-0.5">{summary?.activeEmployees ?? "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-5 min-w-0">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <UserCheck className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Hadir Tepat Waktu</p>
              <p className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-0.5">{statusCount("present")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-5 min-w-0">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Clock className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Terlambat</p>
              <p className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-0.5">{statusCount("late")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs min-w-0 overflow-hidden">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-5 min-w-0">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 shrink-0">
              <UserX className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">Alpa / Cuti / Sakit</p>
              <p className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                {statusCount("absent") + statusCount("leave") + statusCount("sick")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date & Employee Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs w-full min-w-0 overflow-hidden">
        <div className="space-y-1 flex-1 min-w-0">
          <Label className="text-xs font-semibold text-slate-700">Periode Dari</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-[160px] rounded-xl text-xs" />
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <Label className="text-xs font-semibold text-slate-700">Sampai</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-[160px] rounded-xl text-xs" />
        </div>

        {/* HR ONLY: Filter Employee */}
        {isManager && (
          <div className="space-y-1 w-full sm:w-auto min-w-0">
            <Label className="text-xs font-semibold text-slate-700">Filter Karyawan (Khusus HR)</Label>
            <Select value={empFilter} onValueChange={setEmpFilter}>
              <SelectTrigger className="w-full sm:w-[220px] rounded-xl text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Semua Karyawan</SelectItem>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* MOBILE LIST VIEW (Shown on small screens for smartphone users) */}
      <div className="block sm:hidden space-y-3 w-full min-w-0">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">
            {isManager ? "Riwayat Presensi Karyawan" : "Riwayat Presensi Saya"}
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">({records?.length ?? 0} Record)</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Memuat data presensi...
          </div>
        ) : (records ?? []).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
            Tidak ada catatan absensi pada periode ini
          </div>
        ) : (
          records?.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3 w-full min-w-0 overflow-hidden">
              
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-xs truncate">{r.employeeName}</p>
                  <p className="text-[10px] text-slate-400 truncate">{r.employeeNo} • {formatDate(r.date)}</p>
                </div>
                <Badge variant={statusVariant(r.status)} className="capitalize text-[10px] px-2 py-0.5 shrink-0">
                  {statusLabel(r.status)}
                </Badge>
              </div>

              {/* Shift info badge */}
              <div className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center justify-between min-w-0">
                <span className="truncate">{r.shiftName || "Shift Pagi"}</span>
                <span className="font-mono text-slate-500 shrink-0">{r.shiftHours || "08:00 – 16:00"}</span>
              </div>

              {/* Check-in & Check-out Photos preview stack */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 w-full min-w-0">
                
                {/* Check-In Box */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 w-full min-w-0 overflow-hidden">
                  <div className="text-[10px] font-bold text-blue-700 flex items-center justify-between">
                    <span className="flex items-center gap-1"><LogIn className="w-3 h-3 text-blue-600 shrink-0" /> Check-In</span>
                    <span className="font-mono">{formatTime(r.checkIn)}</span>
                  </div>
                  {r.photoBase64 ? (
                    <div className="flex items-center gap-2 cursor-pointer min-w-0" onClick={() => setSelectedRecord(r)}>
                      <img src={r.photoBase64} alt="Selfie In" className="w-9 h-9 rounded-lg object-cover ring-1 ring-blue-500/30 shrink-0" />
                      <span className="text-[10px] text-slate-600 line-clamp-2 leading-tight min-w-0 break-words">
                        {r.locationAddress || "GPS Verified"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Manual / -</span>
                  )}
                </div>

                {/* Check-Out Box */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 w-full min-w-0 overflow-hidden">
                  <div className="text-[10px] font-bold text-amber-700 flex items-center justify-between">
                    <span className="flex items-center gap-1"><LogOut className="w-3 h-3 text-amber-600 shrink-0" /> Check-Out</span>
                    <span className="font-mono">{formatTime(r.checkOut)}</span>
                  </div>
                  {r.outPhotoBase64 ? (
                    <div className="flex items-center gap-2 cursor-pointer min-w-0" onClick={() => setSelectedRecord(r)}>
                      <img src={r.outPhotoBase64} alt="Selfie Out" className="w-9 h-9 rounded-lg object-cover ring-1 ring-amber-500/30 shrink-0" />
                      <span className="text-[10px] text-slate-600 line-clamp-2 leading-tight min-w-0 break-words">
                        {r.outLocationAddress || "GPS Verified"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">Belum Check-Out</span>
                  )}
                </div>

              </div>

              {/* Late warning if late */}
              {r.status === "late" && r.lateDurationStr && (
                <div className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1 min-w-0">
                  <AlertTriangle className="w-3 h-3 shrink-0" /> <span className="truncate">{r.lateDurationStr}</span>
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full h-9 text-xs text-blue-600 rounded-xl font-semibold" onClick={() => setSelectedRecord(r)}>
                <Eye className="w-3.5 h-3.5 mr-1.5 shrink-0" /> Lihat Detail Foto & Lokasi GPS
              </Button>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Shown on medium and large screens) */}
      <Card className="hidden sm:block border-slate-200 shadow-xs overflow-hidden w-full min-w-0">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              {isManager ? "Riwayat Presensi Seluruh Karyawan" : "Riwayat Presensi Saya"}
            </CardTitle>
            <CardDescription className="text-xs">
              {isManager ? "Manajemen rekap absensi karyawan" : "Daftar hadir dan durasi keterlambatan Anda"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">Tanggal</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Karyawan</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Shift Kerja</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Foto & GPS Masuk</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Foto & GPS Keluar</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Jam Masuk / Keluar</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Status & Terlambat</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-slate-400 font-medium">
                    Memuat data absensi...
                  </TableCell>
                </TableRow>
              ) : (
                records?.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="whitespace-nowrap font-medium text-slate-800 text-xs">{formatDate(r.date)}</TableCell>
                    <TableCell>
                      <p className="font-bold text-slate-900 text-xs">{r.employeeName}</p>
                      <p className="text-[11px] text-slate-400">{r.employeeNo}</p>
                    </TableCell>

                    {/* Shift Info */}
                    <TableCell>
                      <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 font-semibold text-[11px]">
                        {r.shiftName || "Shift Pagi"} ({r.shiftHours || "08:00 – 16:00"})
                      </Badge>
                    </TableCell>
                    
                    {/* Foto Selfie & GPS Masuk */}
                    <TableCell>
                      {r.photoBase64 ? (
                        <div 
                          className="flex items-center gap-2 cursor-pointer group"
                          onClick={() => setSelectedRecord(r)}
                        >
                          <img 
                            src={r.photoBase64} 
                            alt="Selfie Masuk" 
                            className="w-9 h-9 rounded-lg object-cover ring-2 ring-blue-500/30 group-hover:scale-105 transition-transform shrink-0" 
                          />
                          <div className="min-w-0 max-w-[150px]">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded truncate max-w-full">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{r.locationAddress || "GPS Verified"}</span>
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Manual / -</span>
                      )}
                    </TableCell>

                    {/* Foto Selfie & GPS Keluar */}
                    <TableCell>
                      {r.outPhotoBase64 ? (
                        <div 
                          className="flex items-center gap-2 cursor-pointer group"
                          onClick={() => setSelectedRecord(r)}
                        >
                          <img 
                            src={r.outPhotoBase64} 
                            alt="Selfie Keluar" 
                            className="w-9 h-9 rounded-lg object-cover ring-2 ring-amber-500/30 group-hover:scale-105 transition-transform shrink-0" 
                          />
                          <div className="min-w-0 max-w-[150px]">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded truncate max-w-full">
                              <MapPin className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{r.outLocationAddress || "GPS Verified"}</span>
                            </span>
                          </div>
                        </div>
                      ) : r.checkOut ? (
                        <span className="text-xs text-slate-400 italic">Manual HR</span>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Belum Check-Out</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-slate-700">
                      <div><strong className="text-blue-700">In:</strong> {formatTime(r.checkIn)}</div>
                      <div><strong className="text-amber-700">Out:</strong> {formatTime(r.checkOut)}</div>
                    </TableCell>

                    {/* Status & Durasi Terlambat */}
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={statusVariant(r.status)} className="capitalize text-xs">
                          {statusLabel(r.status)}
                        </Badge>
                        {r.status === "late" && r.lateDurationStr && (
                          <div className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {r.lateDurationStr}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700" onClick={() => setSelectedRecord(r)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Detail
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && (records ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-xs text-slate-400 font-medium">
                    Tidak ada catatan absensi pada rentang periode ini
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hidden Canvas for Canvas Snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera & GPS Attendance Modal (Mobile Optimized) */}
      <Dialog open={cameraModalOpen} onOpenChange={(open) => { if (!open) closeCameraModal(); }}>
        <DialogContent className="max-w-md w-[95%] rounded-2xl p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-extrabold text-slate-900">
              <Camera className="w-5 h-5 text-blue-600" />
              Absen {attendanceType === "checkIn" ? "Masuk (Check-In)" : "Keluar (Check-Out)"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            {/* OPSI SHIFT KERJA (Khusus Check-In) */}
            {attendanceType === "checkIn" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Pilih Shift Kerja Hari Ini:
                </Label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {SHIFT_OPTIONS.map((s) => {
                    const IconComp = s.icon;
                    const selected = selectedShift === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedShift(s.id as ShiftOption)}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          selected 
                            ? "bg-blue-50 border-blue-600 ring-2 ring-blue-500/20 text-blue-900 font-bold" 
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <IconComp className={`w-3.5 h-3.5 mb-1 ${selected ? "text-blue-600" : "text-slate-400"}`} />
                        <div className="text-[11px] sm:text-xs leading-none font-bold">{s.label}</div>
                        <div className="text-[9px] sm:text-[10px] text-slate-400 mt-1 font-mono">{s.hours}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Live Camera / Captured Image Container */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-[4/3] flex items-center justify-center border border-slate-800 shadow-inner">
              {!capturedPhoto ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={capturedPhoto}
                  alt="Captured Selfie"
                  className="w-full h-full object-cover"
                />
              )}

              {/* Camera Status Overlay Badge */}
              <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{capturedPhoto ? "Foto Terambil" : "Kamera Live Aktif"}</span>
              </div>
            </div>

            {/* GPS Location Status Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" /> Alamat Lokasi GPS
                </span>
                {gpsLoading ? (
                  <span className="text-[10px] text-amber-600 animate-pulse">Melacak Alamat Lengkap...</span>
                ) : gpsLocation ? (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Terverifikasi
                  </span>
                ) : (
                  <span className="text-[10px] text-rose-500 font-bold">Gagal</span>
                )}
              </div>

              {gpsLocation ? (
                <div className="space-y-1">
                  <p className="text-xs text-slate-800 font-medium leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
                    {gpsLocation.address || `Lat: ${gpsLocation.lat.toFixed(5)}, Lng: ${gpsLocation.lng.toFixed(5)}`}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">
                    Koordinat Presisi: {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
                  </p>
                </div>
              ) : gpsError ? (
                <p className="text-xs text-rose-600 font-medium">{gpsError}</p>
              ) : (
                <p className="text-xs text-slate-400 italic">Mengambil alamat lokasi GPS dari HP Anda...</p>
              )}
            </div>

            {/* Controls */}
            {!capturedPhoto ? (
              <Button 
                onClick={takeSnapshot} 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm"
              >
                <Camera className="w-4 h-4 mr-2" /> Ambil Foto Selfie & Lokasi GPS
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={retakeSnapshot} 
                  className="flex-1 rounded-xl border-slate-200 h-11 text-xs"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Foto Ulang
                </Button>
                <Button 
                  onClick={submitAttendance} 
                  disabled={checkIn.isPending || checkOut.isPending}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md h-11 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submit Absen
                </Button>
              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="max-w-xl w-[95%] rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">Detail Lengkap Presensi Karyawan</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <p className="font-bold text-slate-900 text-sm sm:text-base">{selectedRecord.employeeName}</p>
                  <p className="text-xs text-slate-500">{selectedRecord.employeeNo} • {formatDate(selectedRecord.date)}</p>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant={statusVariant(selectedRecord.status)} className="capitalize text-xs">
                    {statusLabel(selectedRecord.status)}
                  </Badge>
                  {selectedRecord.status === "late" && selectedRecord.lateDurationStr && (
                    <p className="text-xs font-bold text-rose-600 flex items-center justify-end gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> {selectedRecord.lateDurationStr}
                    </p>
                  )}
                </div>
              </div>

              {/* Shift info badge */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900">
                  Shift Kerja: {selectedRecord.shiftName || "Shift Pagi"}
                </span>
                <span className="font-mono text-blue-700 font-bold">
                  Jam Kerja: {selectedRecord.shiftHours || "08:00 – 16:00"}
                </span>
              </div>

              {/* Grid 2 Columns: Check-In vs Check-Out */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Check-In Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                      <LogIn className="w-3.5 h-3.5 text-blue-600" /> Presensi Masuk
                    </span>
                    <span className="text-xs font-bold text-slate-800">{formatTime(selectedRecord.checkIn)}</span>
                  </div>

                  {selectedRecord.photoBase64 ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 aspect-[4/3]">
                      <img src={selectedRecord.photoBase64} alt="Selfie Masuk" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-400 italic">
                      Tidak ada foto check-in
                    </div>
                  )}

                  {selectedRecord.latitude && selectedRecord.longitude ? (
                    <div className="space-y-1.5 text-xs bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" /> Lokasi GPS:
                        </span>
                        <a 
                          href={`https://www.google.com/maps?q=${selectedRecord.latitude},${selectedRecord.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          Buka Peta <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {selectedRecord.locationAddress || `Lat: ${selectedRecord.latitude}, Lng: ${selectedRecord.longitude}`}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Check-Out Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5 text-amber-600" /> Presensi Keluar
                    </span>
                    <span className="text-xs font-bold text-slate-800">{formatTime(selectedRecord.checkOut)}</span>
                  </div>

                  {selectedRecord.outPhotoBase64 ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-950 aspect-[4/3]">
                      <img src={selectedRecord.outPhotoBase64} alt="Selfie Keluar" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-400 italic">
                      {selectedRecord.checkOut ? "Absen keluar diinput HR" : "Belum melakukan absen keluar"}
                    </div>
                  )}

                  {selectedRecord.outLatitude && selectedRecord.outLongitude ? (
                    <div className="space-y-1.5 text-xs bg-white p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-600" /> Lokasi GPS:
                        </span>
                        <a 
                          href={`https://www.google.com/maps?q=${selectedRecord.outLatitude},${selectedRecord.outLongitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                        >
                          Buka Peta <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed">
                        {selectedRecord.outLocationAddress || `Lat: ${selectedRecord.outLatitude}, Lng: ${selectedRecord.outLongitude}`}
                      </p>
                    </div>
                  ) : null}
                </div>

              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" className="w-full rounded-xl" onClick={() => setSelectedRecord(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Manual Mark Dialog for Managers */}
      <Dialog open={markDialog} onOpenChange={setMarkDialog}>
        <DialogContent className="rounded-2xl w-[95%] max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Absensi Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Karyawan *</Label>
              <Select
                value={markForm.employeeId}
                onValueChange={(val) => setMarkForm((f) => ({ ...f, employeeId: val }))}
              >
                <SelectTrigger className="rounded-xl text-xs"><SelectValue placeholder="Pilih Karyawan" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {employees?.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tanggal *</Label>
              <Input
                type="date"
                value={markForm.date}
                onChange={(e) => setMarkForm((f) => ({ ...f, date: e.target.value }))}
                className="rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status *</Label>
              <Select
                value={markForm.status}
                onValueChange={(val) => setMarkForm((f) => ({ ...f, status: val as any }))}
              >
                <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ATT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Catatan</Label>
              <Input
                value={markForm.notes}
                onChange={(e) => setMarkForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Contoh: Izin terlambat karena hujan deras"
                className="rounded-xl text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!markForm.employeeId) {
                  toast.error("Pilih karyawan terlebih dahulu");
                  return;
                }
                mark.mutate({
                  employeeId: Number(markForm.employeeId),
                  date: markForm.date,
                  status: markForm.status,
                  notes: markForm.notes || undefined,
                });
              }}
              disabled={mark.isPending}
              className="bg-blue-600 text-white font-bold rounded-xl"
            >
              Simpan Presensi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
