require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const users = [
  {
    email: process.env.ADMIN_EMAIL || "admin@betterfund.test",
    password: process.env.ADMIN_PASSWORD || "BetterFund!Admin2026",
    fullName: process.env.ADMIN_NAME || "BetterFund Admin",
    role: "admin",
  },
  {
    email: process.env.DEMO_CREATOR_EMAIL || "creator@betterfund.test",
    password: process.env.DEMO_CREATOR_PASSWORD || "BetterFund!Creator2026",
    fullName: process.env.DEMO_CREATOR_NAME || "Demo Creator",
    role: "creator",
  },
];

async function ensureUser(user) {
  const { data: existing, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  let account = existing?.users?.find((candidate) => candidate.email === user.email);
  if (!account) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });
    if (error) throw error;
    account = data.user;
    console.log(`Created ${user.role} user: ${user.email}`);
  } else {
    const { error } = await supabase.auth.admin.updateUserById(account.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.fullName },
    });
    if (error) throw error;
    console.log(`Updated ${user.role} user: ${user.email}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: user.role, full_name: user.fullName, updated_at: new Date().toISOString() })
    .eq("id", account.id);
  if (profileError) throw profileError;

  return account;
}

async function main() {
  for (const user of users) {
    await ensureUser(user);
  }
  console.log("Auth user seeding complete.");
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
