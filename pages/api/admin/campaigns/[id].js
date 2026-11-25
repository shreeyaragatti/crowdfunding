import supabaseAdmin from "../../../../lib/supabaseAdmin";
import { requireAdmin } from "../../../../lib/authServer";
import { serializeDonation } from "../../../../lib/campaignSerializers";

async function signDocument(document) {
  const { data } = await supabaseAdmin.storage
    .from("campaign-documents")
    .createSignedUrl(document.document_path, 3600);
  return { ...document, signedUrl: data?.signedUrl || null };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const id = req.query.id;
  const context = await requireAdmin(req);
  if (context.error) {
    res.status(context.status).json({ error: context.error });
    return;
  }

  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from("campaign_metadata")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (campaignError || !campaign) {
    res.status(404).json({ error: "Campaign not found." });
    return;
  }

  const [
    { data: creator },
    { data: documents, error: documentError },
    { data: donations, error: donationError },
    { data: events, error: eventError },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", campaign.creator_id).maybeSingle(),
    supabaseAdmin.from("campaign_supporting_documents").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    supabaseAdmin.from("campaign_donations").select("*").eq("campaign_address", campaign.contract_address || id).order("created_at", { ascending: false }),
    supabaseAdmin.from("campaign_review_events").select("*").eq("campaign_id", id).order("created_at", { ascending: true }),
  ]);

  if (documentError || donationError || eventError) {
    res.status(500).json({ error: (documentError || donationError || eventError).message });
    return;
  }

  const signedDocuments = await Promise.all((documents || []).map(signDocument));

  res.status(200).json({
    campaign: {
      id: campaign.id,
      creatorId: campaign.creator_id,
      creatorName: creator?.full_name || "",
      creatorEmail: creator?.email || "",
      creatorAddress: campaign.creator_address,
      name: campaign.name,
      description: campaign.description,
      imageUrl: campaign.image_url,
      targetWei: campaign.target_wei,
      minimumContributionWei: campaign.minimum_contribution_wei,
      transactionHash: campaign.transaction_hash,
      contractAddress: campaign.contract_address,
      status: campaign.status,
      category: campaign.category,
      beneficiaryType: campaign.beneficiary_type,
      beneficiaryCount: campaign.beneficiary_count,
      location: campaign.location,
      urgencyLevel: campaign.urgency_level,
      reviewNotes: campaign.review_notes,
      rejectionReason: campaign.rejection_reason,
      reviewedAt: campaign.reviewed_at,
      submittedAt: campaign.submitted_at,
      publishedAt: campaign.published_at,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
    },
    creator,
    documents: signedDocuments,
    donations: (donations || []).map(serializeDonation),
    reviewEvents: events || [],
  });
}
