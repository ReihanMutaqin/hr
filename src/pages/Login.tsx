import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

const DEMO_ACCOUNTS = [
  { username: "admin", password: "admin123", role: "Administrator" },
  { username: "sinta.hr", password: "hr12345", role: "HR Manager" },
  { username: "budi.k", password: "budi123", role: "Karyawan" },
];

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

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-xl">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">NexusHR</h1>
          <p className="mt-1 text-sm text-slate-400">
            Sistem Manajemen HR dengan AI Rerank
          </p>
        </div>

        <Card className="border-slate-700 bg-white/95 shadow-2xl backdrop-blur">
          <CardHeader>
            <CardTitle>Masuk ke Akun</CardTitle>
            <CardDescription>Gunakan kredensial Anda untuk melanjutkan</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={login.isPending}>
                <LogIn className="mr-2 h-4 w-4" />
                {login.isPending ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Akun demo:</div>
              <div className="grid gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => fillDemo(acc.username, acc.password)}
                    className="flex items-center justify-between rounded-md border border-dashed border-slate-300 px-3 py-2 text-left text-xs transition-colors hover:border-indigo-400 hover:bg-indigo-50"
                  >
                    <span className="font-medium">{acc.username}</span>
                    <span className="text-muted-foreground">{acc.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Didukung NVIDIA Llama Nemotron Rerank via OpenRouter
        </p>
      </div>
    </div>
  );
}
