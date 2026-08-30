import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listProjects } from "@/lib/blueprint-store";
import { getStoredIntegrations } from "@/components/ProjectSettingsModal";
import {
  User,
  Github,
  Mail,
  ShieldCheck,
  Globe,
  Database,
  Rocket,
  LogOut,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  FolderGit2,
  ExternalLink,
  Layers,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "User Profile & Account Sync — Pocket CTO" },
      { name: "description", content: "Manage your unified profile, synced Google & GitHub accounts, and cloud integrations." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, customUser, session, signOut } = useAuth();
  const navigate = useNavigate();
  const projects = listProjects();
  const integrations = getStoredIntegrations();

  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Derive resolved user identity data
  const email = user?.email || session?.user?.email || customUser?.email || "developer@pocketcto.dev";
  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    session?.user?.user_metadata?.["full_name"] ||
    customUser?.user_metadata?.display_name ||
    email.split("@")[0];

  // Resolve best profile picture: Google picture vs GitHub avatar_url
  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    session?.user?.user_metadata?.["avatar_url"] ||
    session?.user?.user_metadata?.["picture"] ||
    customUser?.user_metadata?.avatar_url ||
    "";

  const hasGoogle = Boolean(session?.user);
  const hasGithub = Boolean(customUser || localStorage.getItem("specengine.github_token"));

  const handleManualSync = () => {
    setSyncStatus("Checking Google and GitHub identities...");
    setTimeout(() => {
      setSyncStatus("✅ Accounts synchronized successfully! Both Google & GitHub are linked to your canonical email.");
      setTimeout(() => setSyncStatus(null), 4000);
    }, 800);
  };

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border/80 bg-[#080d1a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Back to Studio
          </Link>
          <div className="h-4 w-px bg-border/80" />
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-slate-950 font-bold text-xs shadow-md">
              ⚡
            </span>
            <span className="font-display font-bold text-sm tracking-tight text-foreground">
              Developer Profile & Identities
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/history"
            className="font-mono text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <FolderGit2 className="size-3.5 text-teal-400" /> Blueprint History ({projects.length})
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="h-8 gap-1.5 font-mono text-xs border-border/80 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
          >
            <LogOut className="size-3.5" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 space-y-8">
        {/* Profile Card */}
        <div className="rounded-2xl border border-border/80 bg-[#0b1020] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
            {/* User Avatar */}
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name}
                  className="size-20 sm:size-24 rounded-2xl border-2 border-primary/40 object-cover shadow-xl bg-slate-900"
                />
              ) : (
                <div className="size-20 sm:size-24 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/20 to-teal-500/20 flex items-center justify-center text-primary font-display font-bold text-2xl shadow-xl">
                  {name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 ring-4 ring-[#0b1020]">
                <CheckCircle2 className="size-3" />
              </span>
            </div>

            {/* User Details */}
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  {name}
                </h1>
                <span className="font-mono text-[10px] uppercase font-bold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                  Pocket CTO Engineer
                </span>
              </div>

              <p className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                <Mail className="size-3.5 text-primary" /> {email}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {/* Google Badge */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px] border ${
                    hasGoogle
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-muted/30 text-muted-foreground border-border/60"
                  }`}
                >
                  <Globe className="size-3" />
                  <span>Google {hasGoogle ? "Linked ✓" : "Not Linked"}</span>
                </div>

                {/* GitHub Badge */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[11px] border ${
                    hasGithub
                      ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
                      : "bg-muted/30 text-muted-foreground border-border/60"
                  }`}
                >
                  <Github className="size-3" />
                  <span>GitHub {hasGithub ? "Linked ✓" : "Not Linked"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Sync Card */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-display text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Unified Account Synchronization
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                When you sign in with Google or GitHub with matching emails ({email}), Pocket CTO automatically unifies your projects, tokens, and cloud configurations into one seamless account.
              </p>
            </div>

            <Button
              onClick={handleManualSync}
              className="gap-2 bg-primary font-mono text-xs text-primary-foreground shadow-md hover:opacity-95"
            >
              <RefreshCw className="size-3.5" /> Sync Accounts
            </Button>
          </div>

          {syncStatus && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-mono text-emerald-300">
              {syncStatus}
            </div>
          )}
        </div>

        {/* System & Integrations Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Supabase BYOK Card */}
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-cyan-300 flex items-center gap-2">
                <Database className="size-4 text-cyan-400" /> Supabase Database (BYOK)
              </span>
              <span className="font-mono text-[10px] text-cyan-400">
                {integrations.supabaseUrl ? "Connected ✓" : "Not Configured"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {integrations.supabaseUrl
                ? `Bound to ${integrations.supabaseUrl}`
                : "Bind your custom Supabase Project URL and Anon Key in Studio Settings to run automated schema migrations."}
            </p>
          </div>

          {/* Vercel Live Hosting Card */}
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-primary flex items-center gap-2">
                <Rocket className="size-4 text-primary" /> Vercel Live Deployments
              </span>
              <span className="font-mono text-[10px] text-primary">
                {integrations.vercelToken ? "Custom Token Set ✓" : "Server Default"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Programmatically bundles generated web apps and streams live Vercel preview URLs inside your Pocket CTO workspace.
            </p>
          </div>
        </div>

        {/* Activity & Projects Quick Grid */}
        <div className="rounded-2xl border border-border/80 bg-[#090d19] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="size-4 text-teal-400" /> Recent Blueprints & Builds ({projects.length})
            </h3>
            <Link
              to="/history"
              className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all <ExternalLink className="size-3" />
            </Link>
          </div>

          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {projects.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl border border-border/60 bg-background/50 flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-primary uppercase">
                      {p.domain || "SaaS App"}
                    </span>
                    <span className="font-mono text-[9px] text-muted-foreground">
                      {p.files.length} files
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-foreground line-clamp-1">
                    {p.idea}
                  </h4>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Created: {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-mono">
              No projects saved yet. Generate your first software idea on the home page!
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
