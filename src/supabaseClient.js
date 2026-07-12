import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://daeodfxsjzycmeazcrfb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iOUihYkqpZ2R-MFo1h0TYA_coyEEE3n';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
