import { createClient } from "@supabase/supabase-js";
import backendConfig, { isSupabaseConfigured } from "./backendConfig";

const supabase = isSupabaseConfigured
  ? createClient(backendConfig.supabaseUrl, backendConfig.supabaseAnonKey)
  : null;

export default supabase;
