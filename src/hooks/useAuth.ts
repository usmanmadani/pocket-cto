import { useEffect, useState, useCallback, useMemo } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const CUSTOM_USER_KEY = "specengine.custom_user";
export const GITHUB_TOKEN_KEY = "specengine.github_token";
export const AUTH_CHANGE_EVENT = "specengine:auth_change";
export const LINKED_IDENTITIES_KEY = "specengine.linked_identities";

export type CustomAuthUser = {
  id: string;
  email: string;
  user_metadata: {
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
    user_name?: string;
  };
};

export function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function setCustomSession(user: CustomAuthUser, token?: string) {
  if (typeof window === "undefined") return;
  const normalizedEmail = (user.email || "").toLowerCase().trim();
  const normalizedUser: CustomAuthUser = {
    ...user,
    email: normalizedEmail,
  };
  localStorage.setItem(CUSTOM_USER_KEY, JSON.stringify(normalizedUser));

  if (token) {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
    // Link email to GitHub token in registry
    try {
      const existingMap = JSON.parse(
        localStorage.getItem(LINKED_IDENTITIES_KEY) ?? "{}",
      ) as Record<string, string>;
      existingMap[normalizedEmail] = token;
      localStorage.setItem(LINKED_IDENTITIES_KEY, JSON.stringify(existingMap));
    } catch {
      /* ignore */
    }
  }
  notifyAuthChange();
}

export function clearCustomSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CUSTOM_USER_KEY);
  localStorage.removeItem(GITHUB_TOKEN_KEY);
  notifyAuthChange();
}

export function getStoredCustomUser(): CustomAuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CUSTOM_USER_KEY);
    return raw ? (JSON.parse(raw) as CustomAuthUser) : null;
  } catch {
    return null;
  }
}

export function getGitHubTokenForEmail(email?: string): string | null {
  if (typeof window === "undefined") return null;
  const directToken = localStorage.getItem(GITHUB_TOKEN_KEY);
  if (directToken) return directToken;
  if (!email) return null;
  try {
    const registry = JSON.parse(
      localStorage.getItem(LINKED_IDENTITIES_KEY) ?? "{}",
    ) as Record<string, string>;
    return registry[email.toLowerCase().trim()] || null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [customUser, setCustomUser] = useState<CustomAuthUser | null>(getStoredCustomUser());
  const [loading, setLoading] = useState(true);

  const refreshCustomAuth = useCallback(() => {
    setCustomUser(getStoredCustomUser());
  }, []);

  useEffect(() => {
    // 1. Supabase auth listener
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      // Auto-link GitHub token if email matches
      if (s?.user?.email) {
        const ghToken = getGitHubTokenForEmail(s.user.email);
        if (ghToken && !localStorage.getItem(GITHUB_TOKEN_KEY)) {
          localStorage.setItem(GITHUB_TOKEN_KEY, ghToken);
        }
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user?.email) {
        const ghToken = getGitHubTokenForEmail(data.session.user.email);
        if (ghToken && !localStorage.getItem(GITHUB_TOKEN_KEY)) {
          localStorage.setItem(GITHUB_TOKEN_KEY, ghToken);
        }
      }
    });

    // 2. Custom Auth listener
    const handleAuthEvent = () => {
      refreshCustomAuth();
      setLoading(false);
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthEvent);
    window.addEventListener("storage", handleAuthEvent);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthEvent);
      window.removeEventListener("storage", handleAuthEvent);
    };
  }, [refreshCustomAuth]);

  const signOut = useCallback(async () => {
    clearCustomSession();
    await supabase.auth.signOut().catch(() => undefined);
  }, []);

  // Unified Identity Resolver: Merges Google Auth & GitHub OAuth if emails match
  const unifiedUser = useMemo(() => {
    const supabaseUser = session?.user;
    const ghUser = customUser;

    if (!supabaseUser && !ghUser) return null;

    const email = (
      supabaseUser?.email ||
      ghUser?.email ||
      ""
    ).toLowerCase().trim();

    // If both exist or either exists, merge metadata
    const displayName =
      supabaseUser?.user_metadata?.["display_name"] ||
      supabaseUser?.user_metadata?.["full_name"] ||
      ghUser?.user_metadata?.display_name ||
      ghUser?.user_metadata?.full_name ||
      email.split("@")[0];

    const avatarUrl =
      supabaseUser?.user_metadata?.["avatar_url"] ||
      ghUser?.user_metadata?.avatar_url ||
      "";

    const id = supabaseUser?.id || ghUser?.id || `user_${email.replace(/[^a-z0-9]/g, "_")}`;

    const mergedUser: User = {
      id,
      email,
      app_metadata: supabaseUser?.app_metadata || {},
      user_metadata: {
        display_name: displayName,
        full_name: displayName,
        avatar_url: avatarUrl,
        user_name: ghUser?.user_metadata?.user_name || displayName,
        identities: [
          ...(supabaseUser ? ["google/supabase"] : []),
          ...(ghUser ? ["github"] : []),
        ],
      },
      aud: "authenticated",
      created_at: supabaseUser?.created_at || new Date().toISOString(),
    } as unknown as User;

    return mergedUser;
  }, [session, customUser]);

  return {
    session,
    user: unifiedUser,
    customUser,
    loading,
    signOut,
  };
}
