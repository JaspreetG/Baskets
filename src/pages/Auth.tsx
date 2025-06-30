import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { useNavigationType } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function Auth() {
  const navType = useNavigationType();
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  const isBack = navType === "POP";
  const shouldAnimate = !isBack && hasMounted.current;

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) console.error("Login error:", error.message);
  };

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldAnimate ? { opacity: 0, y: 20 } : {}}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 px-4">
        <div className="w-full max-w-sm space-y-6 rounded-2xl border border-gray-700 bg-gray-900 px-8 py-10 shadow-2xl">
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-semibold text-white">
              Login to your account
            </h2>
            <p className="text-sm text-gray-400">
              Access your baskets and manage investments
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-2 bg-white text-gray-900 hover:bg-gray-100"
              variant="outline"
            >
              <FcGoogle className="h-5 w-5" />
              Login with Google
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
