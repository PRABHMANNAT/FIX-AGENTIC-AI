import {
  createBrowserClient as createSSRBrowserClient,
  createServerClient as createSSRServerClient,
} from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type AppSupabaseClient = SupabaseClient;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isSupabaseAdminConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);

export function createBrowserSupabaseClient(): AppSupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  return createSSRBrowserClient(supabaseUrl, supabaseAnonKey);
}

export const createBrowserClientInstance = createBrowserSupabaseClient;
export const createBrowserClient = createBrowserSupabaseClient;

export async function createServerSupabaseClient(): Promise<AppSupabaseClient | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { cookies } = await import("next/headers");
  const cookieStore = cookies();

  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Route handlers and server components cannot always write cookies.
        }
      },
    },
  });
}

export const createServerClientInstance = createServerSupabaseClient;
export const createServerClient = createServerSupabaseClient;

export function createAdminClient(): AppSupabaseClient | null {
  if (!isSupabaseAdminConfigured) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const createAdminSupabaseClient = createAdminClient;

export async function getAuthenticatedUserContext(requestedUserId?: string) {
  if (!isSupabaseConfigured) {
    return {
      error: "You'll need to sign in again.",
      status: 500,
    } as const;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return {
      error: "You'll need to sign in again.",
      status: 500,
    } as const;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: "You'll need to sign in again.",
      status: 401,
    } as const;
  }

  if (requestedUserId && requestedUserId !== user.id) {
    return {
      error: "You don't have access to that.",
      status: 403,
    } as const;
  }

  return {
    userId: user.id,
  } as const;
}
