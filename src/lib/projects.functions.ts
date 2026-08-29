import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SavedProject } from "./blueprint-store";

type ProjectInput = {
  id?: string;
  idea: string;
  domain: string;
  summary: string;
  answers: { question: string; answer: string }[];
  files: { name: string; content: string }[];
  phases?: { number: number; title: string; outcome: string; prompt: string }[];
};

export const listRemoteProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedProject[]> => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      idea: row.idea as string,
      domain: row.domain as string,
      summary: row.summary as string,
      createdAt: row.created_at as string,
      answers: (row.answers ?? []) as SavedProject["answers"],
      files: (row.files ?? []) as SavedProject["files"],
      phases: (row.phases ?? []) as NonNullable<SavedProject["phases"]>,
    }));
  });

export const saveRemoteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProjectInput) => input)
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const row = {
      user_id: context.userId,
      idea: data.idea,
      domain: data.domain ?? "",
      summary: data.summary ?? "",
      answers: data.answers ?? [],
      files: data.files ?? [],
      phases: data.phases ?? [],
      ...(data.id ? { id: data.id } : {}),
    };
    const { data: saved, error } = await context.supabase
      .from("projects")
      .upsert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: saved.id as string };
  });

export const deleteRemoteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", context.userId)
      .maybeSingle();
    return data ?? null;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { display_name: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.display_name })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
