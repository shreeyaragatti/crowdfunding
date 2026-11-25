import { createClient } from "@supabase/supabase-js";
import { serializeCampaign } from "../../lib/campaignSerializers";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  return handleGet(req, res);
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
      .eq("status", "published")
      .not("contract_address", "is", null);

    if (req.query.id) {
      query = query.eq("contract_address", String(req.query.id)).maybeSingle();
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;

    if (req.query.id) {
      res.status(200).json({ campaign: serializePublicCampaign(data) });
      return;
    }

    res.status(200).json({ campaigns: (data || []).map(serializePublicCampaign) });
  } catch (error) {
    console.error("Error fetching campaign metadata:", error);
    res.status(500).json({
      error: error.message || "Could not fetch campaign metadata.",
    });
  }
}

function serializePublicCampaign(campaign) {
  const serialized = serializeCampaign(campaign);
  if (!serialized) return null;
  delete serialized.reviewNotes;
  delete serialized.rejectionReason;
  return serialized;
}
