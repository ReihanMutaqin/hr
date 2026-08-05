import { useState } from "react";
import { useNavigate } from "react-router";
import { Building2, LogIn, AlertCircle, Lock, User, KeyRound, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    login.mutate(
      { username, password },
      {
        onSuccess: () => navigate("/"),
        onError: (err) => setError(err.message),
      },
    );
  };

  const handleQuickLogin = (usr: string, pass: string) => {
    setUsername(usr);
    setPassword(pass);
    setError("");
    login.mutate(
      { username: usr, password: pass },
      {
        onSuccess: () => navigate("/"),
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1329] p-4 sm:p-6 relative overflow-hidden font-sans">
      
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-xl shadow-blue-600/20 mb-2">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Phoenix <span className="text-blue-400">System</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Platform Rekrutmen & Manajemen SDM Enterprise
          </p>
        </div>

        {/* Card Form Container */}
        <Card className="border border-slate-800 bg-slate-900/90 text-white shadow-2xl rounded-3xl backdrop-blur-xl p-2">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-white text-center">Masuk ke Akun</CardTitle>
            <CardDescription className="text-xs text-slate-400 text-center">
              Masukkan kredensial akun Anda untuk mengakses sistem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-rose-500/10 text-rose-300 border-rose-500/30 rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" /> Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  required
                  className="bg-slate-950 border-slate-800 text-white rounded-xl focus:border-blue-500 focus:ring-blue-500 h-11 text-sm placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" /> Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="bg-slate-950 border-slate-800 text-white rounded-xl focus:border-blue-500 focus:ring-blue-500 h-11 text-sm placeholder:text-slate-600"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm mt-2" 
                disabled={login.isPending}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {login.isPending ? "Memverifikasi..." : "Masuk Sekarang"}
              </Button>
            </form>

            {/* Quick Demo Login Preset Buttons */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <p className="text-[11px] text-slate-400 text-center font-medium">Masuk Cepat Demo:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs"
                  onClick={() => handleQuickLogin("admin", "admin123")}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-400" /> Admin / HR
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs"
                  onClick={() => handleQuickLogin("karyawan1", "user123")}
                >
                  <User className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Karyawan
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Phoenix System. Built by RDir Studio.
        </p>

      </div>
    </div>
  );
}
