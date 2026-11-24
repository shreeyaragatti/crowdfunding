import supabaseAdmin from "../../../../../lib/supabaseAdmin";
import { requireCreator } from "../../../../../lib/authServer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const id = req.query.id;
  const context = await requireCreator(req);
  if (context.error) {
    res.status(context.status).json({ error: context.error });
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
  if (campaign.creator_id !== context.profile.id) {
    res.status(403).json({ error: "You do not have permission to submit this campaign." });
    return;
  }
  if (!["draft", "needs_info", "rejected"].includes(campaign.status)) {
    res.status(400).json({ error: "This campaign cannot be submitted for review right now." });
    return;
  }

  const { count, error: countError } = await supabaseAdmin
    .from("campaign_supporting_documents")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", id);
  if (countError) {
    res.status(500).json({ error: countError.message });
    return;
  }
  if (!count || count < 2) {
    res.status(400).json({ error: "Upload at least 2 supporting documents before submitting for review." });
    return;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("campaign_metadata")
    .update({
      status: "pending_review",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
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
    actor_role: "creator",
    action: "submitted",
    notes: req.body?.notes || "Campaign submitted for admin verification.",
  });

  res.status(200).json({ campaign: updated });
}
