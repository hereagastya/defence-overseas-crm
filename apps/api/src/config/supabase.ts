import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Admin client — uses the service-role key; bypasses RLS.
// Used exclusively by the API server (never exposed to the browser).
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
