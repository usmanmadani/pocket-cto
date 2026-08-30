import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Database,
  Rocket,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Globe,
  Loader2,
  Sparkles,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";

export const PROJECT_SETTINGS_KEY = "pocketcto_project_integrations";

export interface ProjectIntegrations {
  supabaseUrl: string;
  supabaseAnonKey: string;
  vercelToken: string;
  vercelTeamId?: string;
}

export function getStoredIntegrations(): ProjectIntegrations {
  if (typeof window === "undefined") {
    return { supabaseUrl: "", supabaseAnonKey: "", vercelToken: "" };
  }
  try {
    const raw = localStorage.getItem(PROJECT_SETTINGS_KEY);
    return raw
      ? JSON.parse(raw)
      : {
          supabaseUrl: "",
          supabaseAnonKey: "",
          vercelToken: "",
        };
  } catch {
    return { supabaseUrl: "", supabaseAnonKey: "", vercelToken: "" };
  }
}

export function saveStoredIntegrations(config: ProjectIntegrations) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROJECT_SETTINGS_KEY, JSON.stringify(config));
}

interface ProjectSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (config: ProjectIntegrations) => void;
}

export function ProjectSettingsModal({
  open,
  onOpenChange,
  onSaved,
}: ProjectSettingsModalProps) {
  const [config, setConfig] = useState<ProjectIntegrations>(getStoredIntegrations());
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setConfig(getStoredIntegrations());
      setSupabaseStatus("idle");
      setStatusMessage("");
      setSavedSuccess(false);
    }
  }, [open]);

  const handleTestSupabase = async () => {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      setSupabaseStatus("error");
      setStatusMessage("Please enter both Supabase URL and Anon Key.");
      return;
    }

    setTestingSupabase(true);
    setSupabaseStatus("idle");
    setStatusMessage("");

    try {
      const client = createClient(config.supabaseUrl, config.supabaseAnonKey);
      const { data, error } = await client.auth.getSession();
      if (error && !error.message.includes("session")) {
        setSupabaseStatus("error");
        setStatusMessage(`Connection failed: ${error.message}`);
      } else {
        setSupabaseStatus("success");
        setStatusMessage("✅ Successfully connected to your Supabase project!");
      }
    } catch (err: any) {
      setSupabaseStatus("error");
      setStatusMessage(`Error connecting: ${err?.message || String(err)}`);
    } finally {
      setTestingSupabase(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredIntegrations(config);
    setSavedSuccess(true);
    if (onSaved) onSaved(config);
    setTimeout(() => {
      onOpenChange(false);
    }, 800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border bg-[#080d1a] text-foreground p-6 sm:p-7 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-teal-500 text-slate-950 font-bold shadow-md shadow-primary/20">
              <Database className="size-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-foreground">
                Cloud Integrations & BYOK Credentials
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Connect your external Supabase database and Vercel hosting token to deploy live previews.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 pt-2">
          {/* Section 1: Supabase Database BYOK */}
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-cyan-300">
                <Database className="size-3.5" /> Supabase Database (Isolated / BYOK)
              </div>
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                Open Dashboard <ExternalLink className="size-2.5" />
              </a>
            </div>

            <div className="space-y-2">
              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  Supabase Project URL (VITE_SUPABASE_URL)
                </Label>
                <Input
                  value={config.supabaseUrl}
                  onChange={(e) => setConfig({ ...config, supabaseUrl: e.target.value })}
                  placeholder="https://xyzcompany.supabase.co"
                  className="mt-1 font-mono text-xs bg-background/60 border-border/80 text-foreground"
                />
              </div>

              <div>
                <Label className="font-mono text-[11px] text-muted-foreground">
                  Supabase Anon Key (VITE_SUPABASE_ANON_KEY)
                </Label>
                <Input
                  type="password"
                  value={config.supabaseAnonKey}
                  onChange={(e) => setConfig({ ...config, supabaseAnonKey: e.target.value })}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="mt-1 font-mono text-xs bg-background/60 border-border/80 text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestSupabase}
                disabled={testingSupabase || !config.supabaseUrl}
                className="h-7 font-mono text-[11px] border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20"
              >
                {testingSupabase ? (
                  <Loader2 className="size-3 animate-spin mr-1" />
                ) : (
                  <ShieldCheck className="size-3 mr-1 text-cyan-400" />
                )}
                Test Database Connection
              </Button>

              {statusMessage && (
                <span
                  className={`font-mono text-[10px] ${
                    supabaseStatus === "success" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {statusMessage}
                </span>
              )}
            </div>
          </div>

          {/* Section 2: Vercel Live Deployment API */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-semibold text-primary">
                <Rocket className="size-3.5" /> Vercel Deployment Token (Optional)
              </div>
              <a
                href="https://vercel.com/account/tokens"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] text-primary hover:underline flex items-center gap-1"
              >
                Get Token <ExternalLink className="size-2.5" />
              </a>
            </div>

            <div>
              <Label className="font-mono text-[11px] text-muted-foreground">
                Vercel Access Token
              </Label>
              <Input
                type="password"
                value={config.vercelToken}
                onChange={(e) => setConfig({ ...config, vercelToken: e.target.value })}
                placeholder="Enter personal token (or use server default)"
                className="mt-1 font-mono text-xs bg-background/60 border-border/80 text-foreground"
              />
              <p className="font-mono text-[10px] text-muted-foreground/70 mt-1">
                Pocket CTO deploys in-memory builds directly to Vercel and binds your Supabase credentials into the environment.
              </p>
            </div>
          </div>

          {/* Dialog Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="font-mono text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              className="gap-1.5 bg-primary font-mono text-xs text-primary-foreground shadow-md hover:opacity-95"
            >
              {savedSuccess ? <Check className="size-3.5 text-emerald-300" /> : <ShieldCheck className="size-3.5" />}
              {savedSuccess ? "Saved & Connected!" : "Save Integrations"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
