import { createClient } from "@supabase/supabase-js";

/**
 * Safely retrieves environment variables to prevent module-level crashes 
 * in browser environments where 'process' might not be defined.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    const missing = [];
    if (!SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
    if (!SUPABASE_ANON_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');
    throw new Error(
        `Missing Supabase client environment variables: ${missing.join(', ')}. ` +
        'Set them in Vercel or .env and restart the app.'
    );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    }
  }
);

/**
 * Checks if the database is reachable.
 * Returns true if a response (even a permission error) is received from Supabase.
 * Returns false only if a network-level failure occurs.
 */
export const checkDbConnection = async (): Promise<boolean> => {
    try {
        // Using a basic select from a likely-to-exist table
        // Even if RLS blocks it, the error object returned proves connectivity
        const { error } = await supabase.from('profiles').select('id').limit(1);
        
        // If there is no error, we are online
        if (!error) return true;
        
        // If there is an error, we check if it has a code (meaning the server responded)
        // Network failures usually don't have a database error code
        if (error.code || (error as any).status) {
            console.debug("[Supabase] Server reached with status/code:", error.code || (error as any).status);
            return true;
        }

        // Check specifically for common fetch errors
        if (error.message && (
            error.message.includes('fetch') || 
            error.message.includes('NetworkError') ||
            error.message.includes('Failed to fetch')
        )) {
            return false;
        }

        // If we got here but the server didn't respond with a code, assume unreachable
        return false;
    } catch (e) {
        console.error("[Supabase] Connection check failure:", e);
        return false;
    }
};

/**
 * Injects the JWT access token into the Supabase client headers.
 */
export const setSupabaseToken = (token: string | null) => {
    if (token) {
        supabase.functions.setAuth(token);
        // @ts-ignore - Check if realtime exists before calling
        if (supabase.realtime) supabase.realtime.setAuth(token);
    }
};