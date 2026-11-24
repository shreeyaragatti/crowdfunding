import supabaseAdmin from "../../../../lib/supabaseAdmin";
import { requireCreator, requireAdmin } from "../../../../lib/authServer";
import { serializeCampaign } from "../../../../lib/campaignSerializers";

async function getCampaign(id) {
  const { data, error } = await supabaseAdmin
    .from("campaign_metadata")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function canAccess(profile, campaign) {
  return profile.role === "admin" || campaign.creator_id === profile.id;
}

export default async function handler(req, res) {
  const id = req.query.id;
  if (!id) {
    res.status(400).json({ error: "Campaign id is required." });
    return;
  }

  const context = await requireCreator(req);
  if (context.error) {
    res.status(context.status).json({ error: context.error });
    return;
  }

  let campaign;
  try {
    campaign = await getCampaign(id);
  } catch (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }

  if (!canAccess(context.profile, campaign)) {
    res.status(403).json({ error: "You do not have permission to view this campaign." });
    return;
  }

  if (req.method === "GET") {
    const { data: documents, error: docError } = await supabaseAdmin
      .from("campaign_supporting_documents")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });
    if (docError) {
      res.status(500).json({ error: docError.message });
      return;
    }

    const { data: donations, error: donationError } = await supabaseAdmin
      .from("campaign_donations")
      .select("*")
      .eq("campaign_address", campaign.contract_address || id)
      .order("created_at", { ascending: false });
    if (donationError) {
      res.status(500).json({ error: donationError.message });
      return;
    }

    const { data: events, error: eventError } = await supabaseAdmin
      .from("campaign_review_events")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });
    if (eventError) {
      res.status(500).json({ error: eventError.message });
      return;
    }

    res.status(200).json({
      campaign: serializeCampaign(campaign),
      documents: documents || [],
      donations: donations || [],
      reviewEvents: events || [],
    });
    return;
  }

  if (req.method === "PATCH") {
    const editableStatuses = ["draft", "needs_info", "rejected"];
    if (!editableStatuses.includes(campaign.status)) {
      res.status(400).json({ error: "This campaign cannot be edited in its current status." });
      return;
    }

    const body = req.body || {};
    const updates = {};
    if (body.name) updates.name = String(body.name).trim();
    if (body.description) updates.description = String(body.description).trim();
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl || null;
    if (body.targetWei) updates.target_wei = String(body.targetWei);
    if (body.minimumContributionWei) updates.minimum_contribution_wei = String(body.minimumContributionWei);
    if (body.category) updates.category = body.category;
    if (body.beneficiaryType) updates.beneficiary_type = body.beneficiaryType;
    if (body.beneficiaryCount !== undefined) updates.beneficiary_count = Number(body.beneficiaryCount) || 1;
    if (body.location !== undefined) updates.location = body.location || null;
    if (body.urgencyLevel) updates.urgency_level = body.urgencyLevel;
    updates.updated_at = new Date().toISOString();

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

    res.status(200).json({ campaign: serializeCampaign(updated) });
    return;
  }

  res.setHeader("Allow", "GET, PATCH");
  res.status(405).json({ error: "Method not allowed." });
}
