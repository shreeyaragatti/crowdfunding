import fs from "fs";
import formidable from "formidable";
import supabaseAdmin from "../../../../../lib/supabaseAdmin";
import { requireCreator } from "../../../../../lib/authServer";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: MAX_FILE_SIZE,
      filter: ({ mimetype }) => ALLOWED_TYPES.has(mimetype || ""),
    });

    form.parse(req, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });

const getSingleValue = (value) => (Array.isArray(value) ? value[0] : value);
const getFileExtension = (file) => {
  const originalName = file.originalFilename || "";
  const extension = originalName.split(".").pop();
  if (extension && extension !== originalName) return extension.toLowerCase();
  return (file.mimetype || "application/octet-stream").split("/").pop() || "bin";
};
const classify = (mimeType) => {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType?.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "document";
  return "file";
};

async function signDocument(document) {
  const { data } = await supabaseAdmin.storage
    .from("campaign-documents")
    .createSignedUrl(document.document_path, 3600);
  return { ...document, signedUrl: data?.signedUrl || null };
}

export default async function handler(req, res) {
  const id = req.query.id;
  const context = await requireCreator(req);
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
  if (campaign.creator_id !== context.profile.id) {
    res.status(403).json({ error: "You do not have permission to manage these documents." });
    return;
  }

  if (req.method === "GET") {
    const { data: documents, error } = await supabaseAdmin
      .from("campaign_supporting_documents")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    const signed = await Promise.all((documents || []).map(signDocument));
    res.status(200).json({ documents: signed });
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (campaign.status === "published") {
    res.status(400).json({ error: "Supporting documents cannot be changed after publication." });
    return;
  }

  let parsed;
  try {
    parsed = await parseForm(req);
  } catch (error) {
    res.status(400).json({ error: error.message || "Invalid upload." });
    return;
  }

  const file = getSingleValue(parsed.files.document || parsed.files.file || parsed.files.proof);
  if (!file) {
    res.status(400).json({ error: "Select a supporting document to upload." });
    return;
  }
  if (!ALLOWED_TYPES.has(file.mimetype || "")) {
    res.status(400).json({ error: "Document must be an image, video, or PDF." });
    return;
  }

  const bucket = "campaign-documents";
  const { error: bucketError } = await supabaseAdmin.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: Array.from(ALLOWED_TYPES),
  });
  if (bucketError && bucketError.statusCode !== "409") {
    res.status(500).json({ error: bucketError.message });
    return;
  }

  const objectPath = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${getFileExtension(file)}`;
  const buffer = fs.readFileSync(file.filepath);
  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.mimetype,
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) {
    res.status(500).json({ error: uploadError.message });
    return;
  }

  const { data: document, error: insertError } = await supabaseAdmin
    .from("campaign_supporting_documents")
    .insert({
      campaign_id: id,
      uploader_id: context.profile.id,
      document_type: classify(file.mimetype),
      document_name: file.originalFilename || "document",
      document_path: objectPath,
      mime_type: file.mimetype,
      file_size: file.size,
    })
    .select()
    .single();

  if (insertError) {
    res.status(500).json({ error: insertError.message });
    return;
  }

  res.status(201).json({ document: await signDocument(document) });
}
