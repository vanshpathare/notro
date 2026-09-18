// backend/src/middlewares/adminMiddleware.js
const jwt = require("jsonwebtoken");
const supabase = require("../../config/supabase.js");

const ADMIN_PHONES = (process.env.ADMIN_PHONES || "")
  .split(",")
  .map((p) => p.trim());

module.exports = async function adminMiddleware(req, res, next) {
  try {
    // 1. Optional Machine-to-Machine Secret (For server cron jobs only, e.g. orphan cleanup)
    const cronSecret = req.headers["x-admin-token"];
    if (
      cronSecret &&
      process.env.ADMIN_SECRET &&
      cronSecret === process.env.ADMIN_SECRET
    ) {
      req.user = {
        id: "system-cron",
        role: "admin",
        name: "System Automation",
      };
      return next();
    }

    // 2. Extract the ELEVATED admin session cookie (issued only after solving the 2 passphrases)
    let elevatedToken = req.cookies?.admin_elevated_token;
    if (!elevatedToken && req.headers.authorization?.startsWith("Bearer ")) {
      elevatedToken = req.headers.authorization.split(" ")[1];
    }

    // Return 404 to act like the endpoint doesn't exist
    if (!elevatedToken) {
      return res.status(404).json({ error: "Endpoint not found" });
    }

    // 3. Verify JWT signature & ensure elevated flag is active
    let decoded;
    try {
      decoded = jwt.verify(elevatedToken, process.env.JWT_SECRET);
    } catch {
      return res.status(404).json({ error: "Endpoint not found" });
    }

    if (!decoded.elevated || !decoded.id) {
      return res.status(404).json({ error: "Endpoint not found" });
    }

    // 4. Verify Identity against Database & ADMIN_PHONES allowlist
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, phone, is_banned, name")
      .eq("id", decoded.id)
      .single();

    if (
      error ||
      !profile ||
      profile.is_banned ||
      !ADMIN_PHONES.includes(profile.phone)
    ) {
      return res.status(404).json({ error: "Endpoint not found" });
    }

    // 5. Attach authenticated admin profile to request
    req.user = profile;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
};
