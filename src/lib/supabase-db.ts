/**
 * Supabase database adapter for _y Company
 * Uses @supabase/supabase-js (already installed)
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required');
    }
    _client = createClient(url, key);
  }
  return _client;
}

export async function query(
  table: string,
  options: { where?: Record<string, unknown>; orderBy?: string; ascending?: boolean; limit?: number } = {}
): Promise<unknown[]> {
  const client = getSupabaseClient();
  let q = client.from(table).select('*');
  if (options.where) {
    for (const [col, val] of Object.entries(options.where)) {
      q = q.eq(col, val);
    }
  }
  if (options.orderBy) {
    q = q.order(options.orderBy, { ascending: options.ascending ?? false });
  }
  if (options.limit) {
    q = q.limit(options.limit);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function insert(table: string, data: Record<string, unknown>): Promise<unknown> {
  const client = getSupabaseClient();
  const { data: result, error } = await client.from(table).insert(data).select().single();
  if (error) throw error;
  return result;
}

export async function update(table: string, id: string, data: Record<string, unknown>): Promise<unknown> {
  const client = getSupabaseClient();
  const { data: result, error } = await client.from(table).update(data).eq('id', id).select().single();
  if (error) throw error;
  return result;
}

export async function remove(table: string, id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) throw error;
}
