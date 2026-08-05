import { useState } from "react";
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
  Sparkles,
  FileUser,
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
  { to: "/candidates", label: "Kandidat", icon: FileUser, roles: ["admin", "hr"] },
  { to: "/attendance", label: "Absensi", icon: CalendarCheck, roles: ["admin", "hr", "employee"] },
  { to: "/leave", label: "Cuti", icon: CalendarDays, roles: ["admin", "hr", "employee"] },
  { to: "/payroll", label: "Payroll", icon: Wallet, roles: ["admin", "hr", "employee"] },
  { to: "/performance", label: "Performance", icon: TrendingUp, roles: ["admin", "hr", "employee"] },
  { to: "/announcements", label: "Pengumuman", icon: Megaphone, roles: ["admin", "hr", "employee"] },
  { to: "/users", label: "Pengguna", icon: UserCog, roles: ["admin", "hr"] },
];

const ROLE_LABELS = { admin: "Administrator", hr: "HR Manager", employee: "Karyawan" } as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((i) => user && i.roles.includes(user.role));
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white",
            )
          }
        >
          <item.icon className="h-4.5 w-4.5 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-md">
        <Building2 className="h-5 w-5 text-white" />
      </div>
      <div>
        <div className="text-base font-bold text-white tracking-tight">NexusHR</div>
        <div className="text-[11px] text-slate-400">Enterprise HR Platform</div>
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 border-r border-slate-800 fixed inset-y-0 left-0 z-30">
        <SidebarBrand />
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav />
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-blue-600 text-white text-xs">
                {user ? initials(user.fullName) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{user?.fullName}</div>
              <div className="text-[11px] text-slate-400">
                {user ? ROLE_LABELS[user.role] : ""}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-white/80 px-4 backdrop-blur lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-slate-900 p-0 border-slate-800">
              <SidebarBrand />
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1.5 border-emerald-200 bg-emerald-50/80 text-emerald-700 font-normal text-xs px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Smart Evaluation Active
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    {user ? initials(user.fullName) : "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">{user?.fullName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-medium">{user?.fullName}</div>
                <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
