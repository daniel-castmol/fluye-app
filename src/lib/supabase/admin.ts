import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service role key.
 * Use ONLY on the server for privileged operations (e.g. deleting auth users).
 * Never import this in client components.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
