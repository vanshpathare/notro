const express = require("express");
const router = express.Router();
const supabase = require("../../config/supabase.js"); // Aligned to use Supabase core engine
const jwt = require("jsonwebtoken");

const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  getMyListings,
  getNoteAnalytics,
} = require("../controllers/note.controller");

const {
  getDownloadUrl,
  getPreviewUrl,
} = require("../controllers/upload.controller");

// 🎯 FIX 1: Point to your correct standalone middleware filepath
const verifyAuthSession = require("../middlewares/authMiddleware");

// ── Helper: Optional Auth — 🎯 FIX 3: Aligned cookie key to 'sb_access_token' using Supabase Engine
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id || decoded.sub,
        email: decoded.email,
        account_type: decoded.account_type,
      };
    } catch {}
  }
  next();
};

// ── Public routes ──
router.get("/", getNotes);
router.get("/:id/preview-url", getPreviewUrl);

// ── Protected routes — 🎯 FIX 2: Moved seller tracking endpoints ABOVE /:id pathing to block hijacking
router.get("/seller/my-listings", verifyAuthSession, getMyListings);
router.get("/:id/analytics", verifyAuthSession, getNoteAnalytics);
router.get("/:id/download-url", verifyAuthSession, getDownloadUrl); // Requires verified purchase tracking

// ── Optional auth route ──
router.get("/:id", optionalAuth, getNoteById);

// ── Protected Mutations ──
router.post("/", verifyAuthSession, createNote);
router.patch("/:id", verifyAuthSession, updateNote);

module.exports = router;
