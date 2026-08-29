import { useEffect, useState, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const CUSTOM_USER_KEY = "specengine.custom_user";
export const GITHUB_TOKEN_KEY = "specengine.github_token";
export const AUTH_CHANGE_EVENT = "specengine:auth_change";

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
  localStorage.setItem(CUSTOM_USER_KEY, JSON.stringify(user));
  if (token) {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
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
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
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

  const activeUser = session?.user ?? (customUser as unknown as User | null);

  return {
    session,
    user: activeUser,
    customUser,
    loading,
    signOut,
  };
}
