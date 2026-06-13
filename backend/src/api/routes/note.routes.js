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

// 🎯 FIX 1: Point to your correct standalone middleware filepath
const verifyAuthSession = require("../middlewares/authMiddleware.js");

// ── Helper: Optional Auth — 🎯 FIX 3: Aligned cookie key to 'sb_access_token' using Supabase Engine
const optionalAuth = async (req, res, next) => {
  const token =
    req.cookies?.sb_access_token || req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) req.user = user;
    } catch {}
  }
  next();
};

// ── Public routes ──
router.get("/", getNotes);

// ── Protected routes — 🎯 FIX 2: Moved seller tracking endpoints ABOVE /:id pathing to block hijacking
router.get("/seller/my-listings", verifyAuthSession, getMyListings);
router.get("/:id/analytics", verifyAuthSession, getNoteAnalytics);

// ── Optional auth route ──
router.get("/:id", optionalAuth, getNoteById);

// ── Protected Mutations ──
router.post("/", verifyAuthSession, createNote);
router.patch("/:id", verifyAuthSession, updateNote);

module.exports = router;
