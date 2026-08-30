import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseTenantCredentials {
  projectRef?: string;
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export class SupabaseTenantManager {
  /**
   * Initializes client connection for a specific project tenant
   */
  static getTenantClient(credentials: SupabaseTenantCredentials): SupabaseClient {
    return createClient(credentials.supabaseUrl, credentials.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  /**
   * Applies schema migrations to tenant database using raw SQL execution or REST DDL
   */
  static async runTenantMigrations(
    credentials: SupabaseTenantCredentials,
    sqlMigrations: string[],
  ): Promise<{ success: boolean; executedCount: number; errors: string[] }> {
    if (!credentials.supabaseUrl || !credentials.anonKey) {
      return { success: false, executedCount: 0, errors: ["Missing Supabase credentials"] };
    }

    const client = this.getTenantClient(credentials);
    let executedCount = 0;
    const errors: string[] = [];

    for (const sql of sqlMigrations) {
      if (!sql.trim()) continue;
      try {
        const { error } = await client.rpc("exec_sql", { query: sql });
        if (error) {
          console.warn(`Direct RPC notice for tenant DB (${credentials.supabaseUrl}): ${error.message}`);
          errors.push(error.message);
        } else {
          executedCount++;
        }
      } catch (err) {
        errors.push(String(err));
      }
    }

    return {
      success: errors.length === 0,
      executedCount,
      errors,
    };
  }
}
