import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Wallet,
  TrendingUp,
  Megaphone,
  UserCog,
  LogOut,
  Menu,
  FileUser,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ("admin" | "hr" | "employee")[];
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "hr"] },
  { to: "/employees", label: "Karyawan", icon: Users, roles: ["admin", "hr"] },
  { to: "/organization", label: "Organisasi", icon: Building2, roles: ["admin", "hr"] },
  { to: "/recruitment", label: "Rekrutmen & Talent", icon: Briefcase, roles: ["admin", "hr"] },
  { to: "/candidates", label: "Master Kandidat", icon: FileUser, roles: ["admin", "hr"] },
  { to: "/attendance", label: "Absensi & Presensi", icon: CalendarCheck, roles: ["admin", "hr", "employee"] },
  { to: "/leave", label: "Pengajuan Cuti", icon: CalendarDays, roles: ["admin", "hr", "employee"] },
  { to: "/payroll", label: "Penggajian / Payroll", icon: Wallet, roles: ["admin", "hr", "employee"] },
  { to: "/performance", label: "Kinerja Karyawan", icon: TrendingUp, roles: ["admin", "hr", "employee"] },
  { to: "/announcements", label: "Pengumuman", icon: Megaphone, roles: ["admin", "hr", "employee"] },
  { to: "/users", label: "Manajemen Akses", icon: UserCog, roles: ["admin", "hr"] },
];

const ROLE_LABELS = { admin: "Administrator", hr: "HR Manager", employee: "Karyawan" } as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((i) => user && i.roles.includes(user.role));
  return (
    <nav className="flex flex-col gap-1.5 px-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200",
              isActive
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200",
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className="flex items-center gap-3">
                <item.icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-blue-200 opacity-80" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-5 py-6 border-b border-slate-800/80 mb-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 shadow-md shadow-blue-600/20 text-white font-black text-xl">
        P
      </div>
      <div>
        <div className="text-base font-extrabold text-white tracking-tight flex items-center gap-1">
          Phoenix <span className="text-blue-400">System</span>
        </div>
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          Enterprise HR Platform
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => navigate("/login") });
  };

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* Desktop Executive Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#0b1329] border-r border-slate-800/80 fixed inset-y-0 left-0 z-30 shadow-xl">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto py-1">
          <SidebarNav />
        </div>
        
        {/* User Card inside Sidebar */}
        <div className="p-3.5 m-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-blue-500/30">
            <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
              {user ? initials(user.fullName) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-white">{user?.fullName}</div>
            <div className="text-[10px] text-slate-400 font-medium">
              {user ? ROLE_LABELS[user.role] : ""}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex flex-1 flex-col lg:pl-64 min-w-0 w-full overflow-x-hidden">
        
        {/* Header Bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md lg:px-8 shadow-2xs">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-slate-700">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-[#0b1329] p-0 border-slate-800 text-white">
              <SidebarBrand />
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Header left info */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistem Operasional HR Aktif</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-700 font-semibold">{todayStr}</span>
          </div>

          <div className="flex-1" />

          {/* User profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-slate-100">
                <Avatar className="h-8 w-8 ring-2 ring-slate-200">
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                    {user ? initials(user.fullName) : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 leading-none">{user?.fullName}</div>
                  <div className="text-[10px] text-slate-400 capitalize mt-0.5">{user?.role}</div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 border-slate-200 shadow-xl">
              <DropdownMenuLabel className="p-2">
                <div className="font-bold text-slate-900 text-sm">{user?.fullName}</div>
                <div className="text-xs text-slate-500 font-normal">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600 rounded-xl cursor-pointer font-semibold p-2.5">
                <LogOut className="mr-2 h-4 w-4" />
                Keluar dari Sistem
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
