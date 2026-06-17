const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middlewares/authMiddleware"); // ← match your actual filename
const {
  getSellerProfile,
  followSeller,
  unfollowSeller,
} = require("../controllers/seller.controller");

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

router.get("/:id/profile", optionalAuth, getSellerProfile);

router.use(authMiddleware);
router.post("/:id/follow", followSeller);
router.delete("/:id/follow", unfollowSeller);

module.exports = router;
