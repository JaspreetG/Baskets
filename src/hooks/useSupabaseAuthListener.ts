import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";
import type { User } from "@supabase/auth-js";

export function useSupabaseAuthListener() {
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          const user: User = session.user;
          setUser({
            id: user.id,
            email: user.email ?? "",
            provider: user.app_metadata?.provider ?? "",
            name: user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      },
    );
    // Set initial user
    const userPromise = supabase.auth.getUser?.();
    if (typeof userPromise?.then === "function") {
      (userPromise as Promise<{ data: { user: User | null } }>).then((res) => {
        if (res?.data?.user) {
          const user = res.data.user;
          setUser({
            id: user.id,
            email: user.email ?? "",
            provider: user.app_metadata?.provider ?? "",
            name: user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [setUser, setLoading]);
}
