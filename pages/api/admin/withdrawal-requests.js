import supabaseAdmin from "../../../lib/supabaseAdmin";
import { requireAdmin } from "../../../lib/authServer";
import { getCampaignWithdrawalData } from "../../../lib/withdrawalRequests";

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

  if (!supabaseAdmin) {
    res.status(200).json({ campaigns: [] });
    return;
  }

  let query = supabaseAdmin
    .from("campaign_metadata")
    .select("id, name, contract_address, status")
    .eq("status", "published")
    .not("contract_address", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (req.query.campaignAddress) {
    query = query.eq("contract_address", String(req.query.campaignAddress));
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const campaigns = await Promise.all(
    (data || []).map(async (campaign) => {
      try {
        const withdrawalData = await getCampaignWithdrawalData(
          campaign.contract_address
        );
        return {
          id: campaign.id,
          name: campaign.name,
          contractAddress: campaign.contract_address,
          ...withdrawalData,
          error: "",
        };
      } catch (loadError) {
        return {
          id: campaign.id,
          name: campaign.name,
          contractAddress: campaign.contract_address,
          platformAdmin: null,
          manager: null,
          balance: "0",
          approversCount: 0,
          requests: [],
          legacy: false,
          error:
            loadError.message ||
            "Could not load withdrawal requests from the blockchain.",
        };
      }
    })
  );

  res.status(200).json({ campaigns });
}
