import supabaseAdmin from "../../lib/supabaseAdmin";
import { serializeDonation } from "../../lib/campaignSerializers";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }

  if (req.method === "POST") {
    return handlePost(req, res);
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(req, res) {
  try {
    if (!supabaseAdmin) {
      res.status(200).json({ donations: [] });
      return;
    }

    const campaignAddress = String(req.query.campaignAddress || "");
    if (!campaignAddress) {
      res.status(400).json({ error: "campaignAddress is required." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("campaign_donations")
      .select("*")
      .eq("campaign_address", campaignAddress)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ donations: (data || []).map(serializeDonation) });
  } catch (error) {
    console.error("Donation fetch error:", error);
    res.status(500).json({ error: error.message || "Could not fetch donations." });
  }
}

async function handlePost(req, res) {
  try {
    if (!supabaseAdmin) {
      res.status(500).json({
        error: "Supabase is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.",
      });
      return;
    }

    const {
      campaignAddress,
      donorAddress,
      donorName,
      amountWei,
      message,
      transactionHash,
      source,
    } = req.body || {};

    if (!campaignAddress || !donorAddress || !amountWei) {
      res.status(400).json({
        error: "campaignAddress, donorAddress, and amountWei are required.",
      });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("campaign_donations")
      .insert({
        campaign_address: campaignAddress,
        donor_address: donorAddress,
        donor_name: donorName || null,
        amount_wei: String(amountWei),
        message: message || null,
        transaction_hash: transactionHash || null,
        source: source || "dev",
      })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ donation: serializeDonation(data) });
  } catch (error) {
    console.error("Donation save error:", error);
    res.status(500).json({ error: error.message || "Donation could not be saved." });
  }
}
