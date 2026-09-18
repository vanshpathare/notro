const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { verifyAuthSession } = require("../middlewares/authMiddleware"); // ← match your actual filename
const {
  getSellerProfile,
  followSeller,
  unfollowSeller,
} = require("../controllers/seller.controller");
const supabase = require("../../config/supabase.js");

// Optional auth — public can view profile, but logged-in users see is_following
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {}
  }
  next();
};

// GET /api/sellers/search?q=vansh
router.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.json({ success: true, sellers: [] });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, avatar_url, account_type, verification_status, is_seller",
    )
    .eq("is_seller", true)
    .eq("is_deleted", false)
    .ilike("name", `%${q.trim()}%`)
    .limit(5);

  if (error) return res.status(500).json({ error: "Search failed" });
  return res.json({ success: true, sellers: data || [] });
});

router.get("/:id/profile", optionalAuth, getSellerProfile);

router.use(verifyAuthSession);
router.post("/:id/follow", followSeller);
router.delete("/:id/follow", unfollowSeller);

module.exports = router;
