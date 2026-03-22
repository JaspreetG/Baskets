import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

export default function Auth() {
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) console.error("Login error:", error.message);
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute -top-[20%] -left-[10%] h-[50vw] w-[50vw] rounded-full bg-primary-100/40 blur-[100px]" />
      <div className="absolute -bottom-[20%] -right-[10%] h-[50vw] w-[50vw] rounded-full bg-accent-100/40 blur-[100px]" />

      <div className="relative w-full max-w-md space-y-8 rounded-[2.5rem] bg-white/80 p-10 text-center shadow-[0_8px_40px_rgb(0,0,0,0.06)] ring-1 ring-slate-200/50 backdrop-blur-xl sm:p-12">
        
        {/* Logo Display */}
        <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.75rem] bg-white shadow-xl shadow-slate-200/60 ring-1 ring-slate-100 mb-8 p-1">
          <Logo className="h-full w-full rounded-[1.5rem]" />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
            Welcome to Basket
          </h2>
          <p className="text-base font-medium text-slate-500 leading-relaxed px-2">
            Group your favorite stocks, invest seamlessly, and track your portfolio's performance.
          </p>
        </div>

        <div className="pt-6">
          <Button
            onClick={handleGoogleLogin}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-[1.25rem] bg-white text-[15px] font-bold text-slate-700 shadow-[0_4px_15px_rgb(0,0,0,0.05)] ring-1 ring-slate-200/60 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_8px_20px_rgb(0,0,0,0.08)] active:translate-y-0 active:shadow-sm"
            variant="outline"
          >
            <FcGoogle className="h-6 w-6" />
            Continue with Google
          </Button>
        </div>
        
        <p className="mt-8 text-xs font-medium text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
