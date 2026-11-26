import supabaseAdmin from "../../../lib/supabaseAdmin";
import { requireAdmin } from "../../../lib/authServer";

function serializeCampaign(row, creator, documentCount, donation) {
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorName: creator?.full_name || "",
    creatorEmail: creator?.email || "",
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
    documentCount: documentCount || 0,
    donationTotalWei: donation ? donation.totalWei.toString() : "0",
    donorCount: donation ? donation.donorCount : 0,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const context = await requireAdmin(req);
  if (context.error) {
    res.status(context.status).json({ error: context.error });
    return;
  }

  const [
    { data: creators, error: creatorError },
    { data: campaigns, error: campaignError },
    { data: donations, error: donationError },
    { data: documents, error: documentError },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("role", "creator").order("created_at", { ascending: false }),
    supabaseAdmin.from("campaign_metadata").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("campaign_donations").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("campaign_supporting_documents").select("campaign_id"),
  ]);

  if (creatorError || campaignError || donationError || documentError) {
    res.status(500).json({ error: (creatorError || campaignError || donationError || documentError).message });
    return;
  }

  const creatorMap = new Map((creators || []).map((creator) => [creator.id, creator]));
  const documentCounts = {};
  for (const document of documents || []) {
    documentCounts[document.campaign_id] = (documentCounts[document.campaign_id] || 0) + 1;
  }
  const donationStats = {};
  for (const donation of donations || []) {
    const current = donationStats[donation.campaign_address] || {
      totalWei: BigInt(0),
      donors: new Set(),
    };
    current.totalWei += BigInt(donation.amount_wei || "0");
    current.donors.add(String(donation.donor_address || "").toLowerCase());
    donationStats[donation.campaign_address] = current;
  }

  const getDonationSummary = (address) => {
    const stats = address ? donationStats[address] : null;
    if (!stats) return null;
    return { totalWei: stats.totalWei, donorCount: stats.donors.size };
  };

  const serializedCampaigns = (campaigns || []).map((campaign) => {
    const stats = getDonationSummary(campaign.contract_address);
    return serializeCampaign(campaign, creatorMap.get(campaign.creator_id), documentCounts[campaign.id], stats);
  });

  const serializedDonations = (donations || []).map((donation) => {
    const campaign = (campaigns || []).find((item) => item.contract_address === donation.campaign_address);
    return {
      id: donation.id,
      campaignId: campaign?.id || null,
      campaignName: campaign?.name || donation.campaign_address,
      donorAddress: donation.donor_address,
      donorName: donation.donor_name,
      amountWei: donation.amount_wei,
      message: donation.message,
      transactionHash: donation.transaction_hash,
      source: donation.source,
      createdAt: donation.created_at,
    };
  });

  const stats = {
    creators: (creators || []).length,
    campaigns: serializedCampaigns.length,
    drafts: serializedCampaigns.filter((c) => c.status === "draft").length,
    pendingReview: serializedCampaigns.filter((c) => c.status === "pending_review").length,
    needsInfo: serializedCampaigns.filter((c) => c.status === "needs_info").length,
    approved: serializedCampaigns.filter((c) => c.status === "approved").length,
    published: serializedCampaigns.filter((c) => c.status === "published").length,
    rejected: serializedCampaigns.filter((c) => c.status === "rejected").length,
    totalDonations: (donations || []).length,
    totalRaisedWei: (donations || []).reduce((total, donation) => total + BigInt(donation.amount_wei || "0"), BigInt(0)).toString(),
  };

  res.status(200).json({
    stats,
    campaigns: serializedCampaigns,
    creators: (creators || []).map((creator) => ({
      id: creator.id,
      email: creator.email,
      fullName: creator.full_name,
      role: creator.role,
      walletAddress: creator.wallet_address,
      createdAt: creator.created_at,
      campaignCount: serializedCampaigns.filter((campaign) => campaign.creatorId === creator.id).length,
    })),
    donations: serializedDonations,
  });
}
