import supabaseAdmin from "../../../../../lib/supabaseAdmin";
import { requireAdmin } from "../../../../../lib/authServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const id = req.query.id;
  const context = await requireAdmin(req);
  if (context.error) {
    res.status(context.status).json({ error: context.error });
    return;
  }

  const { action, notes } = req.body || {};
  const allowedActions = ["approve", "reject", "request_info"];
  if (!allowedActions.includes(action)) {
    res.status(400).json({ error: "Invalid review action." });
    return;
  }

  const { data: campaign, error } = await supabaseAdmin
    .from("campaign_metadata")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }
  if (campaign.status !== "pending_review") {
    res.status(400).json({ error: "Only campaigns awaiting review can be reviewed." });
    return;
  }

  const cleanNotes = String(notes || "").trim();
  const now = new Date().toISOString();
  const updates = {
    reviewed_by: context.profile.id,
    reviewed_at: now,
    updated_at: now,
  };

  let reviewAction = "";
  if (action === "approve") {
    updates.status = "approved";
    updates.review_notes = cleanNotes || "Campaign approved. You can publish it on Sepolia.";
    updates.rejection_reason = null;
    reviewAction = "approved";
  } else if (action === "reject") {
    updates.status = "rejected";
    updates.rejection_reason = cleanNotes || "Campaign rejected.";
    updates.review_notes = cleanNotes || "Campaign rejected.";
    reviewAction = "rejected";
  } else {
    updates.status = "needs_info";
    updates.review_notes = cleanNotes || "Additional supporting information is required.";
    updates.rejection_reason = null;
    reviewAction = "info_requested";
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("campaign_metadata")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (updateError) {
    res.status(500).json({ error: updateError.message });
    return;
  }

  await supabaseAdmin.from("campaign_review_events").insert({
    campaign_id: id,
    actor_id: context.profile.id,
    actor_role: "admin",
    action: reviewAction,
    notes: cleanNotes || null,
  });

  res.status(200).json({ campaign: updated });
}
