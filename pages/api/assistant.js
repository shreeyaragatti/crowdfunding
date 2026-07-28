import supabaseAdmin from "../../lib/supabaseAdmin";
import {
  serializeCampaign,
  serializeDonation,
  serializeProof,
} from "../../lib/campaignSerializers";

const fallbackReply =
  "I can help you compare campaigns, understand proof updates, and decide where to donate. Configure OPENROUTER_API_KEY in .env to enable live AI responses.";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { message, campaignAddress } = req.body || {};

    if (!message || String(message).trim().length < 2) {
      res.status(400).json({ error: "Ask a question first." });
      return;
    }

    const context = await getAssistantContext(campaignAddress);
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL || "gpt-4o-mini";
    const apiHost = normalizeOpenRouterHost(process.env.OPENROUTER_API_HOST || "https://openrouter.ai/api");

    if (!apiKey) {
      res.status(200).json({
        reply: buildFallbackReply(message, context),
        configured: false,
      });
      return;
    }

    const url = buildOpenRouterUrl(apiHost);
    console.log("OpenRouter request URL:", url);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: buildPrompt(message, context),
          },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    const rawBody = await response.text();
    let payload;

    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (parseError) {
      const snippet = rawBody
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300);
      console.error("OpenRouter non-JSON body snippet:", snippet);
      throw new Error(
        `OpenRouter returned non-JSON response [status ${response.status}]` +
          (snippet ? `: ${snippet}...` : "")
      );
    }

    if (!response.ok) {
      throw new Error(
        payload.error?.message || payload.detail || `OpenRouter request failed with status ${response.status}`
      );
    }

    const reply =
      payload.choices?.[0]?.message?.content?.trim() || fallbackReply;

    res.status(200).json({ reply, configured: true });
  } catch (error) {
    console.error("Assistant error:", error);
    res.status(500).json({
      error: error.message || "Assistant could not respond right now.",
    });
  }
}

async function getAssistantContext(campaignAddress) {
  if (!supabaseAdmin) {
    return { campaigns: [], proofs: [], donations: [] };
  }

  const campaignQuery = supabaseAdmin
    .from("campaign_metadata")
    .select("*")
    .in("status", ["created", "deployed"])
    .order("created_at", { ascending: false })
    .limit(8);

  const proofQuery = supabaseAdmin
    .from("campaign_proofs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  const donationQuery = supabaseAdmin
    .from("campaign_donations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(12);

  if (campaignAddress) {
    campaignQuery.eq("contract_address", campaignAddress);
    proofQuery.eq("campaign_address", campaignAddress);
    donationQuery.eq("campaign_address", campaignAddress);
  }

  const [campaignsResult, proofsResult, donationsResult] = await Promise.all([
    campaignQuery,
    proofQuery,
    donationQuery,
  ]);

  return {
    campaigns: (campaignsResult.data || []).map(serializeCampaign),
    proofs: (proofsResult.data || []).map(serializeProof),
    donations: (donationsResult.data || []).map(serializeDonation),
  };
}

function normalizeOpenRouterHost(host = "https://openrouter.ai/api") {
  if (!host || typeof host !== "string") {
    return "https://openrouter.ai/api";
  }

  let cleaned = host.trim();
  cleaned = cleaned.replace(/\/+$/, "");
  return cleaned || "https://openrouter.ai/api";
}

function buildOpenRouterUrl(apiHost) {
  const normalized = normalizeOpenRouterHost(apiHost);
  console.log("Normalized OpenRouter host:", normalized);
  if (normalized.match(/\/api\/v1$/i)) {
    return `${normalized}/chat/completions`;
  }
  if (normalized.match(/\/api$/i)) {
    return `${normalized}/v1/chat/completions`;
  }
  if (normalized.match(/\/v1$/i)) {
    return `${normalized}/chat/completions`;
  }
  return `${normalized}/api/v1/chat/completions`;
}

function formatWeiToEth(wei) {
  if (!wei) return "";
  try {
    const eth = parseFloat(wei) / 1e18;
    if (Number.isNaN(eth)) return "";
    return `${eth.toFixed(3)} ETH`;
  } catch {
    return "";
  }
}

function buildPrompt(message, context) {
  const campaignDetails = (context.campaigns || [])
    .map((c) => {
      const meta = [];
      if (c.category) meta.push(`Category: ${c.category}`);
      if (c.beneficiaryType) meta.push(`Beneficiary: ${c.beneficiaryType}`);
      if (c.beneficiaryCount) meta.push(`Beneficiaries: ~${c.beneficiaryCount}`);
      if (c.location) meta.push(`Location: ${c.location}`);
      if (c.urgencyLevel) meta.push(`Urgency: ${c.urgencyLevel}`);
      if (c.targetWei) meta.push(`Target: ${formatWeiToEth(c.targetWei)}`);
      if (c.minimumContributionWei) meta.push(`Minimum Contribution: ${formatWeiToEth(c.minimumContributionWei)}`);
      if (c.status) meta.push(`Status: ${c.status}`);
      return `"${c.name}" - ${meta.filter(Boolean).join(" | ")} - "${(c.description || "").substring(0, 120)}..."`;
    })
    .join("\n");

  return [
    "You are BetterFund's intelligent donor assistant.",
    "Help donors discover, compare, and choose campaigns that match their interests, values, and urgency.",
    "Use the most recent project details and campaign metadata provided in the context.",
    "",
    "Instructions:",
    "1. Be concise, practical, and transparent.",
    "2. Use supplied campaign metadata, donation history, and proof updates.",
    "3. Do not invent donation amounts, proof links, or campaign progress.",
    "4. When analyzing campaigns, consider category, beneficiary type, location, urgency level, beneficiary count, and funding targets.",
    "5. Help donors find campaigns aligned with their impact goals, values, and safety needs.",
    "6. When possible, recommend relevant campaigns by name along with a short reason.",
    "",
    "Campaign Context:",
    campaignDetails || "No campaigns available.",
    "",
    "Donation History:",
    context.donations.length > 0
      ? context.donations
          .map((d) => `${d.donorName || "Anonymous"} donated ~${formatWeiToEth(d.amountWei)}`)
          .join("\n")
      : "No donations yet.",
    "",
    "Proof Updates:",
    context.proofs.length > 0
      ? context.proofs
          .map((p) => `"${p.title}" - ${p.description.substring(0, 80)}...`)
          .join("\n")
      : "No proof updates yet.",
    "",
    `Donor question: ${message}`,
  ].join("\n");
}

function buildFallbackReply(message, context) {
  const campaigns = context.campaigns || [];
  const proofs = context.proofs || [];

  if (!campaigns.length) {
    return fallbackReply;
  }

  const campaignNames = campaigns.map((campaign) => campaign.name).join(", ");
  const proofLine = proofs.length
    ? `I found ${proofs.length} proof/progress update${proofs.length === 1 ? "" : "s"} connected to the current context.`
    : "I do not see proof updates yet, so ask the campaign creator for progress evidence before donating a large amount.";

  return [
    "OpenRouter is not configured yet, but I can still use the saved campaign context.",
    `Relevant campaign${campaigns.length === 1 ? "" : "s"}: ${campaignNames}.`,
    proofLine,
    `For your question, "${message}", compare the campaign description, target, recent proofs, and donor activity before deciding.`,
  ].join(" ");
}
