"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/lib/public-env";
import type { Database } from "./database.types";

let browserClient: SupabaseClient<Database> | undefined;

export function createClient(): SupabaseClient<Database> {
  if (!browserClient) {
    const { url, anonKey } = supabasePublicEnv();
    browserClient = createBrowserClient<Database>(url, anonKey);
  }
  return browserClient;
}
