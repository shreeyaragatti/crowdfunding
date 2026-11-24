import supabaseAdmin from "./supabaseAdmin";

export async function getAuthContext(req) {
  if (!supabaseAdmin) {
    return { error: "Supabase is not configured.", status: 503 };
  }

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return { error: "Authentication is required.", status: 401 };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return { error: "Your session is invalid or expired. Please sign in again.", status: 401 };
  }

  const user = userData.user;
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Your account profile could not be loaded.", status: 403 };
  }

  return { user, profile, token };
}

export function requireRole(context, roles) {
  if (context.error) return context;
  if (!roles.includes(context.profile.role)) {
    return { error: "You do not have permission to perform this action.", status: 403 };
  }
  return context;
}

export async function requireCreator(req) {
  return requireRole(await getAuthContext(req), ["creator", "admin"]);
}

export async function requireAdmin(req) {
  return requireRole(await getAuthContext(req), ["admin"]);
}
