const backendConfig = {
  provider: process.env.NEXT_PUBLIC_BACKEND_PROVIDER || "supabase",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

export const isSupabaseConfigured = Boolean(
  backendConfig.supabaseUrl && backendConfig.supabaseAnonKey
);

export default backendConfig;
