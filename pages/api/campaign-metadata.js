import { createClient } from "@supabase/supabase-js";
import { serializeCampaign } from "../../lib/campaignSerializers";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  } else if (req.method === "POST") {
    return handlePost(req, res);
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      // Return empty list if not configured
      return res.status(200).json({ campaigns: [] });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase
      .from("campaign_metadata")
      .select("*")
      .in("status", ["created", "deployed"]);

    if (req.query.id) {
      query = query.eq("contract_address", String(req.query.id)).maybeSingle();
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    if (req.query.id) {
      res.status(200).json({ campaign: serializeCampaign(data) });
      return;
    }

    res.status(200).json({ campaigns: (data || []).map(serializeCampaign) });
  } catch (error) {
    console.error("Error fetching campaign metadata:", error);
    res.status(500).json({
      error: error.message || "Could not fetch campaign metadata.",
    });
  }
}

async function handlePost(req, res) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      res.status(500).json({
        error:
          "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.",
      });
      return;
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      contractAddress,
      creatorAddress,
      name,
      description,
      imageUrl,
      targetWei,
      minimumContributionWei,
      transactionHash,
      devMode,
      category,
      beneficiaryType,
      beneficiaryCount,
      location,
      urgencyLevel,
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

    const addressKey = contractAddress || `dev:${Date.now()}`;
    const status = devMode ? "created" : "deployed";

    const { data: campaign, error } = await supabase
      .from("campaign_metadata")
      .insert({
        contract_address: addressKey,
        creator_address: creatorAddress,
        name,
        description,
        image_url: imageUrl,
        target_wei: String(targetWei),
        minimum_contribution_wei: String(minimumContributionWei),
        transaction_hash: transactionHash || null,
        status,
        category: category || "general",
        beneficiary_type: beneficiaryType || "general",
        beneficiary_count: beneficiaryCount || 1,
        location: location || null,
        urgency_level: urgencyLevel || "normal",
      })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ campaign: serializeCampaign(campaign) });
  } catch (error) {
    console.error("Error saving campaign metadata:", error);
    res.status(500).json({
      error: error.message || "Campaign metadata could not be saved.",
    });
  }
}
