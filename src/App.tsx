import { Routes, Route, Navigate } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Organization from "@/pages/Organization";
import Recruitment from "@/pages/Recruitment";
import Attendance from "@/pages/Attendance";
import Leave from "@/pages/Leave";
import Payroll from "@/pages/Payroll";
import Performance from "@/pages/Performance";
import Announcements from "@/pages/Announcements";
import UsersPage from "@/pages/Users";
import NotFound from "@/pages/NotFound";

function RequireAuth({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: ("admin" | "hr" | "employee")[];
}) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/employees"
            element={
              <RequireAuth roles={["admin", "hr"]}>
                <Employees />
              </RequireAuth>
            }
          />
          <Route
            path="/organization"
            element={
              <RequireAuth roles={["admin", "hr"]}>
                <Organization />
              </RequireAuth>
            }
          />
          <Route
            path="/recruitment"
            element={
              <RequireAuth roles={["admin", "hr"]}>
                <Recruitment />
              </RequireAuth>
            }
          />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/leave" element={<Leave />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route
            path="/users"
            element={
              <RequireAuth roles={["admin", "hr"]}>
                <UsersPage />
              </RequireAuth>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </>
  );
}
