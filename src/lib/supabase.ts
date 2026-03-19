import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const DUMMY_URL = 'https://placeholder.supabase.co';
const DUMMY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';
export const supabase = createClient(supabaseUrl || DUMMY_URL, supabaseAnonKey || DUMMY_KEY);
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl || DUMMY_URL, serviceKey || DUMMY_KEY);
}
