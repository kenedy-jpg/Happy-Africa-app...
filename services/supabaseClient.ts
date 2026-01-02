import { createClient } from "@supabase/supabase-js";

/**
 * Safely retrieves environment variables to prevent module-level crashes 
 * in browser environments where 'process' might not be defined.
 */
const getEnvVar = (key: string): string | undefined => {
    try {
        if (typeof process !== 'undefined' && process.env) {
            return (process.env as any)[key];
        }
    } catch (e) {
        // Fallback
    }
    return undefined;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL') || 'https://mlgxgylvndtvyqrdfvlw.supabase.co';
const SUPABASE_ANON_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZ3hneWx2bmR0dnlxcmRmdmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MjYyMjYsImV4cCI6MjA4MTIwMjIyNn0.nc5Uv2Bf9UgfqWc2Ph8LQwqTY09c9IY6WQqtKBXpVr0';

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