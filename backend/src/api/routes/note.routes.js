const express = require("express");
const router = express.Router();
const supabase = require("../../config/supabase.js");
const jwt = require("jsonwebtoken");
const R2Service = require("../../services/R2Service");

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

const {
  verifyAuthSession,
  appSessionGuard,
} = require("../middlewares/authMiddleware");

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

// ── Public routes (no :id pattern — must come first) ──
router.get("/", optionalAuth, getNotes); // ← added optionalAuth

// ── Seller-specific routes (must come before /:id) ──
router.get("/seller/my-listings", verifyAuthSession, getMyListings);

// ── Routes with specific :id sub-paths (must come before plain /:id) ──
router.get("/:id/preview-url", getPreviewUrl);
router.get("/:id/download-url", verifyAuthSession, getDownloadUrl);
router.get(
  "/:id/analytics",
  verifyAuthSession,
  appSessionGuard,
  getNoteAnalytics,
);

// ── Share meta — public, no auth needed ──
router.get("/:id/share-meta", async (req, res) => {
  try {
    const { data: note, error } = await supabase
      .from("notes")
      .select(
        `
        id, title, description, price, subject,
        cover_image_key, purchase_count, average_rating,
        seller:profiles!seller_id ( name )
      `,
      )
      .eq("id", req.params.id)
      .eq("status", "approved")
      .eq("is_deleted", false)
      .single();

    if (error || !note)
      return res.status(404).json({ error: "Note not found" });

    // Cover image — if stored as public URL use directly, else sign it
    let coverUrl = null;
    if (note.cover_image_key) {
      if (note.cover_image_key.startsWith("http")) {
        coverUrl = note.cover_image_key; // permanent public URL
      } else {
        coverUrl = await R2Service.generateImageViewUrl(note.cover_image_key);
      }
    }

    return res.json({
      success: true,
      meta: {
        title: note.title,
        description:
          note.description || `${note.subject} notes by ${note.seller?.name}`,
        price: note.price,
        seller: note.seller?.name,
        purchase_count: note.purchase_count,
        average_rating: note.average_rating,
        cover_url: coverUrl,
        share_url: `https://educrit.in/notes/${note.id}`,
        whatsapp_text:
          `📚 *${note.title}*\nBy ${note.seller?.name}\n💰 ₹${note.price}` +
          `\n⭐ ${note.average_rating} rating\n\nGet it here: https://educrit.in/notes/${note.id}`,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate share metadata" });
  }
});

// ── Plain /:id route — must come LAST among GET routes ──
router.get("/:id", optionalAuth, getNoteById);

// ── Protected mutations ──
router.post("/", verifyAuthSession, createNote);
router.patch("/:id", verifyAuthSession, updateNote);

module.exports = router;
