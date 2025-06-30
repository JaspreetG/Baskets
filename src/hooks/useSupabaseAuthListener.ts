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
    // Set initial user (fix: always set loading true first, then update user, then set loading false)
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
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
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [setUser, setLoading]);
}
