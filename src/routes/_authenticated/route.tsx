import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getStoredCustomUser, setCustomSession } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // 1. Check if returning from OAuth with auth_user query params
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const authUser = searchParams.get("auth_user");
      const ghToken = searchParams.get("github_token");
      if (authUser) {
        try {
          const parsed = JSON.parse(authUser);
          setCustomSession(parsed, ghToken || undefined);
          return { user: parsed };
        } catch {
          /* ignore */
        }
      }

      // 2. Check stored custom GitHub session
      const customUser = getStoredCustomUser();
      if (customUser) {
        return { user: customUser };
      }
    }

    // 3. Check Supabase session
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
