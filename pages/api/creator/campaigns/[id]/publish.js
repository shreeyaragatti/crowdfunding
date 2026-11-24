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

  const { contractAddress, transactionHash } = req.body || {};
  if (!contractAddress || !transactionHash) {
    res.status(400).json({ error: "contractAddress and transactionHash are required." });
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
    res.status(403).json({ error: "You do not have permission to publish this campaign." });
    return;
  }
  if (campaign.status !== "approved") {
    res.status(400).json({ error: "Only approved campaigns can be published on Sepolia." });
    return;
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("campaign_metadata")
    .update({
      contract_address: String(contractAddress),
      transaction_hash: String(transactionHash),
      status: "published",
      published_at: new Date().toISOString(),
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
    action: "published",
    notes: `Published on Sepolia: ${transactionHash}`,
  });

  res.status(200).json({ campaign: updated });
}
