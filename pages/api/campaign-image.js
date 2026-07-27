import fs from "fs";
import formidable from "formidable";
import supabaseAdmin from "../../lib/supabaseAdmin";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const parseForm = (req) =>
  new Promise((resolve, reject) => {
    const form = formidable({
      multiples: false,
      maxFileSize: MAX_IMAGE_SIZE,
      filter: ({ mimetype }) => ALLOWED_TYPES.has(mimetype || ""),
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

  return (file.mimetype || "image/jpeg").split("/").pop() || "jpg";
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { fields, files } = await parseForm(req);
    const image = getSingleValue(files.image);

    if (!image) {
      res.status(400).json({ error: "Select a campaign image to upload." });
      return;
    }

    if (!ALLOWED_TYPES.has(image.mimetype || "")) {
      res.status(400).json({
        error: "Campaign image must be a JPG, PNG, WEBP, or GIF file.",
      });
      return;
    }

    // Require Supabase for image uploads
    if (!supabaseAdmin) {
      res.status(500).json({
        error: "Supabase is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env to enable image uploads.",
      });
      return;
    }

    const bucket = process.env.NEXT_PUBLIC_CAMPAIGN_IMAGE_BUCKET || "campaign-images";
    const creator = getSingleValue(fields.creator) || "anonymous";
    const safeCreator = creator.toLowerCase().replace(/[^a-z0-9]/g, "");
    const extension = getFileExtension(image);
    const objectPath = `${safeCreator || "anonymous"}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;
    const buffer = fs.readFileSync(image.filepath);

    const { error: bucketError } = await supabaseAdmin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_IMAGE_SIZE,
      allowedMimeTypes: Array.from(ALLOWED_TYPES),
    });

    if (bucketError && bucketError.statusCode !== "409") {
      throw bucketError;
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, buffer, {
        contentType: image.mimetype,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);

    res.status(200).json({
      path: objectPath,
      publicUrl: data.publicUrl,
    });
  } catch (error) {
    console.error("Campaign image upload error:", error);
    res.status(500).json({
      error: error.message || "Campaign image upload failed.",
    });
  }
}
