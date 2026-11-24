import { getAuthContext } from "../../../lib/authServer";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed." });
    return;
  }

  const context = await getAuthContext(req);
  if (context.error) {
    res.status(context.status).json({ error: context.error });
    return;
  }

  res.status(200).json({
    user: context.user,
    profile: context.profile,
  });
}
