
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const SUPABASE_URL = 'https://ucnbkexkzlpbbvtkxjtj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjbmJrZXhremxwYmJ2dGt4anRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3OTgzMDcsImV4cCI6MjA4MDM3NDMwN30.R6kzJCf1-gf2nNXJ6eBuyMjWjEfhNqxup1IvQBvVds8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
