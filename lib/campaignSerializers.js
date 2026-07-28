export const serializeCampaign = (campaign) => {
  if (!campaign) return null;

  return {
    id: campaign.id,
    contractAddress: campaign.contract_address,
    creatorAddress: campaign.creator_address,
    name: campaign.name,
    description: campaign.description,
    imageUrl: campaign.image_url,
    targetWei: campaign.target_wei,
    minimumContributionWei: campaign.minimum_contribution_wei,
    transactionHash: campaign.transaction_hash,
    status: campaign.status,
    category: campaign.category,
    beneficiaryType: campaign.beneficiary_type,
    beneficiaryCount: campaign.beneficiary_count,
    location: campaign.location,
    urgencyLevel: campaign.urgency_level,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
  };
};

export const serializeDonation = (donation) => {
  if (!donation) return null;

  return {
    id: donation.id,
    campaignAddress: donation.campaign_address,
    donorAddress: donation.donor_address,
    donorName: donation.donor_name,
    amountWei: donation.amount_wei,
    message: donation.message,
    transactionHash: donation.transaction_hash,
    source: donation.source,
    createdAt: donation.created_at,
  };
};

export const serializeProof = (proof) => {
  if (!proof) return null;

  return {
    id: proof.id,
    campaignAddress: proof.campaign_address,
    uploaderAddress: proof.uploader_address,
    title: proof.title,
    description: proof.description,
    proofUrl: proof.proof_url,
    proofPath: proof.proof_path,
    proofType: proof.proof_type,
    createdAt: proof.created_at,
    updatedAt: proof.updated_at,
  };
};
