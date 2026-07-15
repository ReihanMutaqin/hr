import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
      <p className="text-6xl font-bold text-slate-300">404</p>
      <p className="text-lg font-medium">Halaman tidak ditemukan</p>
      <Button asChild>
        <Link to="/">Kembali ke Dashboard</Link>
      </Button>
    </div>
  );
}
