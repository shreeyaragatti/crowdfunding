require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Child tables are deleted explicitly so the script also works when the
// cascade rules have not been applied to an older database.
const TABLES = [
  "campaign_review_events",
  "campaign_supporting_documents",
  "campaign_proofs",
  "campaign_donations",
  "chain_events",
  "withdrawal_request_metadata",
  "campaign_metadata",
];

const BUCKETS = [
  process.env.NEXT_PUBLIC_CAMPAIGN_IMAGE_BUCKET || "campaign-images",
  process.env.NEXT_PUBLIC_CAMPAIGN_PROOF_BUCKET || "campaign-proofs",
  "campaign-documents",
].filter(Boolean);

const dryRun =
  process.argv.includes("--dry-run") ||
  ["1", "true", "yes"].includes(String(process.env.DRY_RUN || "").toLowerCase());

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    // A missing optional table should not stop the reset.
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      error.message?.toLowerCase().includes("could not find the table")
    ) {
      return 0;
    }
    throw new Error(`${table}: ${error.message}`);
  }

  return count || 0;
}

async function listFolder(bucket, prefix) {
  const entries = [];
  const pageSize = 100;

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });

    if (error) {
      if (
        error.message?.toLowerCase().includes("not found") ||
        error.message?.toLowerCase().includes("does not exist")
      ) {
        return entries;
      }
      throw new Error(`${bucket}/${prefix}: ${error.message}`);
    }

    entries.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return entries;
}

async function collectStoragePaths(bucket, prefix = "") {
  const entries = await listFolder(bucket, prefix);
  const files = [];

  for (const entry of entries) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    const isFolder = !entry.id && !entry.metadata;
    if (isFolder) {
      files.push(...(await collectStoragePaths(bucket, path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

async function clearBucket(bucket) {
  const paths = await collectStoragePaths(bucket);
  if (paths.length === 0) return 0;

  if (dryRun) return paths.length;

  for (let index = 0; index < paths.length; index += 100) {
    const batch = paths.slice(index, index + 100);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw new Error(`${bucket}: ${error.message}`);
  }

  return paths.length;
}

async function main() {
  console.log(
    dryRun
      ? "Dry run: no campaign data will be deleted."
      : "Deleting all campaign data. Accounts and profiles are preserved."
  );

  let totalRows = 0;
  for (const table of TABLES) {
    const before = await countRows(table);
    totalRows += before;

    if (dryRun) {
      console.log(`  ${table}: ${before} row(s) would be deleted`);
      continue;
    }

    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`  ${table}: deleted ${before} row(s)`);
  }

  let totalFiles = 0;
  for (const bucket of [...new Set(BUCKETS)]) {
    const files = await clearBucket(bucket);
    totalFiles += files;
    console.log(
      `  ${bucket}: ${dryRun ? "would delete" : "deleted"} ${files} file(s)`
    );
  }

  console.log(
    dryRun
      ? `Dry run complete: ${totalRows} row(s) and ${totalFiles} file(s) would be deleted.`
      : `Reset complete: deleted ${totalRows} row(s) and ${totalFiles} file(s). Accounts and profiles were not touched.`
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
