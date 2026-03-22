import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Logo className="h-9 w-9 drop-shadow-sm" />
          <span className="text-xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>Basket</span>
        </Link>
        <button
          onClick={() => supabase.auth.signOut()}
          className="rounded-full p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
