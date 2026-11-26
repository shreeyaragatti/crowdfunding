import supabaseAdmin from "../../../../lib/supabaseAdmin";
import { requireCreator } from "../../../../lib/authServer";

function serializeCampaign(row) {
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorAddress: row.creator_address,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    targetWei: row.target_wei,
    minimumContributionWei: row.minimum_contribution_wei,
    transactionHash: row.transaction_hash,
    contractAddress: row.contract_address,
    status: row.status,
    category: row.category,
    beneficiaryType: row.beneficiary_type,
    beneficiaryCount: row.beneficiary_count,
    location: row.location,
    urgencyLevel: row.urgency_level,
    reviewNotes: row.review_notes,
    rejectionReason: row.rejection_reason,
    reviewedAt: row.reviewed_at,
    submittedAt: row.submitted_at,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getDocumentCounts(campaignIds) {
  if (!campaignIds.length) return {};
  const { data } = await supabaseAdmin
    .from("campaign_supporting_documents")
    .select("campaign_id")
    .in("campaign_id", campaignIds);
  const counts = {};
  for (const row of data || []) {
    counts[row.campaign_id] = (counts[row.campaign_id] || 0) + 1;
  }
  return counts;
}

async function getDonationStats(campaignAddresses) {
  const stats = {};
  if (!campaignAddresses.length) return stats;
  const { data } = await supabaseAdmin
    .from("campaign_donations")
    .select("campaign_address, amount_wei, donor_address")
    .in("campaign_address", campaignAddresses);
  for (const row of data || []) {
    const current = stats[row.campaign_address] || {
      totalWei: BigInt(0),
      donors: new Set(),
    };
    current.totalWei += BigInt(row.amount_wei || "0");
    current.donors.add(String(row.donor_address || "").toLowerCase());
    stats[row.campaign_address] = current;
  }
  return stats;
}

export default async function handler(req, res) {
  const context = await requireCreator(req);
  if (context.error) {
    res.status(context.status).json({ error: context.error });
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("campaign_metadata")
      .select("*")
      .eq("creator_id", context.profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const campaigns = (data || []).map(serializeCampaign);
    const counts = await getDocumentCounts(campaigns.map((campaign) => campaign.id));
    const donationStats = await getDonationStats(
      campaigns.map((campaign) => campaign.contractAddress).filter(Boolean)
    );

    for (const campaign of campaigns) {
      campaign.documentCount = counts[campaign.id] || 0;
      const donation = donationStats[campaign.contractAddress];
      campaign.donationTotalWei = donation ? donation.totalWei.toString() : "0";
      campaign.donorCount = donation ? donation.donors.size : 0;
    }

    res.status(200).json({ campaigns });
    return;
  }

  if (req.method === "POST") {
    const {
      name,
      description,
      imageUrl,
      targetWei,
      minimumContributionWei,
      category,
      beneficiaryType,
      beneficiaryCount,
      location,
      urgencyLevel,
    } = req.body || {};

    if (!name || !description || !targetWei || !minimumContributionWei) {
      res.status(400).json({ error: "Name, description, target, and minimum contribution are required." });
      return;
    }

    const targetValue = String(targetWei).trim();
    const minimumValue = String(minimumContributionWei).trim();
    if (!/^[1-9][0-9]*$/.test(targetValue) || !/^[0-9]+$/.test(minimumValue)) {
      res.status(400).json({ error: "Target and minimum contribution must be valid wei amounts." });
      return;
    }

    const { data: campaign, error } = await supabaseAdmin
      .from("campaign_metadata")
      .insert({
        creator_id: context.profile.id,
        creator_address: context.profile.wallet_address || null,
        name: String(name).trim(),
        description: String(description).trim(),
        image_url: imageUrl || null,
        target_wei: targetValue,
        minimum_contribution_wei: minimumValue,
        status: "draft",
        category: category || "general",
        beneficiary_type: beneficiaryType || "general",
        beneficiary_count: Number(beneficiaryCount) || 1,
        location: location || null,
        urgency_level: urgencyLevel || "normal",
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    await supabaseAdmin.from("campaign_review_events").insert({
      campaign_id: campaign.id,
      actor_id: context.profile.id,
      actor_role: "creator",
      action: "submitted",
      notes: "Campaign draft created.",
    });

    res.status(201).json({ campaign: serializeCampaign(campaign) });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed." });
}
