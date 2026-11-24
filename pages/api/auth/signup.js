import supabaseAdmin from "../../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!supabaseAdmin) {
    res.status(503).json({ error: "Supabase is not configured." });
    return;
  }

  const { fullName, email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  if (String(password).length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: String(email).trim(),
    password: String(password),
    email_confirm: true,
    user_metadata: { full_name: String(fullName || "").trim() },
  });

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json({
    user: data.user,
    message: "Account created. You can sign in now.",
  });
}
