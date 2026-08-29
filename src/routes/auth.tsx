import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Github, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth, setCustomSession } from "@/hooks/useAuth";

function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create your Pocket CTO account" },
      {
        name: "description",
        content:
          "Create a personal Pocket CTO account to save your software blueprints, survey answers and build prompts across every device.",
      },
      { property: "og:title", content: "Sign in — Pocket CTO" },
      {
        property: "og:description",
        content: "Sign in to sync your generated blueprints and build prompts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ghError = params.get("github_error");
    const authUser = params.get("auth_user");
    const ghToken = params.get("github_token");

    if (authUser) {
      try {
        const parsed = JSON.parse(authUser);
        setCustomSession(parsed, ghToken || undefined);
        void navigate({ to: "/history", replace: true });
        return;
      } catch {
        /* ignore */
      }
    }

    if (ghError) {
      setError(`GitHub sign-in error: ${ghError}`);
    }

    if (!loading && user) {
      void navigate({ to: "/history", replace: true });
    }
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (err) throw err;
        if (!data.session)
          setNotice("Check your email to confirm your account, then sign in.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
      }
    } catch (err) {
      setError((err as Error).message);
    }
    setBusy(false);
  };

  const google = async () => {
    setError("");
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const github = () => {
    setError("");
    const clientId =
      (typeof process !== "undefined" &&
        (process.env?.["VITE_GITHUB_CLIENT_ID"] || process.env?.["GITHUB_CLIENT_ID"])) ||
      "";
    if (!clientId) {
      setError(
        "Missing GITHUB_CLIENT_ID. Please add GITHUB_CLIENT_ID to your environment variables to enable GitHub sign-in.",
      );
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/github/callback`;
    const scope = "read:user user:email repo";
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri,
    )}&scope=${encodeURIComponent(scope)}`;
  };

  return (
    <main className="hero-glow min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/icon.png"
            alt="Pocket CTO Logo"
            className="size-7 object-contain transition-transform group-hover:scale-105"
          />
          <span className="font-mono text-sm font-semibold tracking-[0.2em] text-primary uppercase">
            Pocket CTO
          </span>
        </Link>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs">
          <Link to="/">
            <ArrowLeft /> Back
          </Link>
        </Button>
      </header>

      <section className="mx-auto max-w-md px-6 py-10">
        <h1 className="font-display text-3xl font-semibold">
          {mode === "signin" ? "Sign in" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your blueprints, survey answers and build prompts sync to your account.
        </p>

        <div className="panel mt-6 p-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Button
              variant="outline"
              className="w-full gap-2 border-border/80 bg-background/50 hover:bg-background"
              onClick={github}
            >
              <Github className="size-4" /> GitHub
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 border-border/80 bg-background/50 hover:bg-background"
              onClick={google}
            >
              <GoogleIcon className="size-4" /> Google
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && <p className="text-sm text-accent">{notice}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setNotice("");
            }}
            className="mt-4 w-full font-mono text-[12px] text-muted-foreground hover:text-primary"
          >
            {mode === "signin"
              ? "No account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </section>
    </main>
  );
}
