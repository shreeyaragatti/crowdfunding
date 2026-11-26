import supabaseAdmin from "./supabaseAdmin";

export async function getPublishedCampaignAddresses() {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from("campaign_metadata")
    .select("contract_address")
    .eq("status", "published")
    .not("contract_address", "is", null);

  if (error) throw error;

  return new Set(
    (data || [])
      .map((row) => String(row.contract_address || "").toLowerCase())
      .filter(Boolean)
  );
}

export async function getPublishedCampaignByAddress(address) {
  if (!supabaseAdmin || !address) return null;

  const { data, error } = await supabaseAdmin
    .from("campaign_metadata")
    .select("*")
    .eq("contract_address", String(address))
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  return data;
}
