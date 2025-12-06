
import { createClient } from '@supabase/supabase-js';

// Safe environment variable accessor that works in Vite, Node, and browser environments
const getEnv = (key: string): string => {
  // 1. Try Vite's import.meta.env
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key] || '';
    }
  } catch (e) {
    // Ignore error
  }

  // 2. Try process.env (Node/Webpack/Legacy)
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || '';
    }
  } catch (e) {
    // Ignore error
  }

  return '';
};

// Access environment variables safely
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing! Check your .env file or Vercel settings.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
