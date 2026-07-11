import supabaseAdmin from "../../lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        error:
          "Supabase admin client is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.",
      });
      return;
    }

    const {
      contractAddress,
      creatorAddress,
      name,
      description,
      imageUrl,
      targetWei,
      minimumContributionWei,
      transactionHash,
    } = req.body || {};

    if (
      !creatorAddress ||
      !name ||
      !description ||
      !targetWei ||
      !minimumContributionWei
    ) {
      res.status(400).json({ error: "Missing campaign metadata." });
      return;
    }

    const addressKey = contractAddress || `pending:${transactionHash}`;
    const status = contractAddress ? "deployed" : "created";

    const { data, error } = await supabaseAdmin
      .from("campaign_metadata")
      .upsert(
        {
          contract_address: addressKey,
          creator_address: creatorAddress,
          name,
          description,
          image_url: imageUrl,
          target_wei: targetWei,
          minimum_contribution_wei: minimumContributionWei,
          transaction_hash: transactionHash,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "contract_address" }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({ campaign: data });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Campaign metadata could not be saved.",
    });
  }
}
