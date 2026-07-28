import fs from "fs";
import formidable from "formidable";
import supabaseAdmin from "../../lib/supabaseAdmin";
import { serializeProof } from "../../lib/campaignSerializers";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_PROOF_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: MAX_PROOF_SIZE,
      filter: ({ mimetype }) => !mimetype || ALLOWED_TYPES.has(mimetype),
    });

    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });

const getSingleValue = (value) => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const getFileExtension = (file) => {
  const originalName = file.originalFilename || "";
  const extension = originalName.split(".").pop();

  if (extension && extension !== originalName) {
    return extension.toLowerCase();
  }

  if (file.mimetype === "application/pdf") return "pdf";
  return (file.mimetype || "image/jpeg").split("/").pop() || "jpg";
};

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
      res.status(200).json({ proofs: [] });
      return;
    }

    const campaignAddress = String(req.query.campaignAddress || "");
    if (!campaignAddress) {
      res.status(400).json({ error: "campaignAddress is required." });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("campaign_proofs")
      .select("*")
      .eq("campaign_address", campaignAddress)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ proofs: (data || []).map(serializeProof) });
  } catch (error) {
    console.error("Proof fetch error:", error);
    res.status(500).json({ error: error.message || "Could not fetch proofs." });
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

    const { fields, files } = await parseForm(req);
    const campaignAddress = getSingleValue(fields.campaignAddress);
    const uploaderAddress = getSingleValue(fields.uploaderAddress);
    const title = getSingleValue(fields.title);
    const description = getSingleValue(fields.description);
    const proofFile = getSingleValue(files.proof);

    if (!campaignAddress || !title || !description) {
      res.status(400).json({
        error: "campaignAddress, title, and description are required.",
      });
      return;
    }

    let proofUrl = null;
    let proofPath = null;
    let proofType = null;

    if (proofFile) {
      if (!ALLOWED_TYPES.has(proofFile.mimetype || "")) {
        res.status(400).json({
          error: "Proof must be a JPG, PNG, WEBP, GIF, or PDF file.",
        });
        return;
      }

      const bucket = process.env.NEXT_PUBLIC_CAMPAIGN_PROOF_BUCKET || "campaign-proofs";
      const safeCampaign = campaignAddress.toLowerCase().replace(/[^a-z0-9:-]/g, "");
      const extension = getFileExtension(proofFile);
      proofPath = `${safeCampaign || "campaign"}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;
      proofType = proofFile.mimetype;

      const { error: bucketError } = await supabaseAdmin.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: MAX_PROOF_SIZE,
        allowedMimeTypes: Array.from(ALLOWED_TYPES),
      });

      if (bucketError && bucketError.statusCode !== "409") {
        throw bucketError;
      }

      const buffer = fs.readFileSync(proofFile.filepath);
      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(proofPath, buffer, {
          contentType: proofFile.mimetype,
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(proofPath);
      proofUrl = data.publicUrl;
    }

    const { data, error } = await supabaseAdmin
      .from("campaign_proofs")
      .insert({
        campaign_address: campaignAddress,
        uploader_address: uploaderAddress || null,
        title,
        description,
        proof_url: proofUrl,
        proof_path: proofPath,
        proof_type: proofType,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ proof: serializeProof(data) });
  } catch (error) {
    console.error("Proof save error:", error);
    res.status(500).json({ error: error.message || "Proof could not be saved." });
  }
}
