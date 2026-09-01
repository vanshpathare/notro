const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware"); // ← match your actual filename
const supabase = require("../../config/supabase.js");
const R2Service = require("../../services/R2Service");
const {
  getMyProfile,
  updateMyProfile,
  becomeSeller,
  deleteMyAccount,
  deleteNote,
  reactivateAccount,
  updateFcmToken,
} = require("../controllers/user.controller");

router.use(authMiddleware);
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.delete("/me", deleteMyAccount);
router.post("/become-seller", becomeSeller);
router.delete("/notes/:id", deleteNote);
router.post("/fcm-token", updateFcmToken);

// DELETE /api/users/avatar
router.delete("/avatar", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current avatar to delete from storage
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", userId)
      .single();

    // Clear avatar_url in database
    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);

    // Delete from public bucket if exists
    if (profile?.avatar_url) {
      if (profile.avatar_url.startsWith(process.env.R2_PUBLIC_URL)) {
        const key = profile.avatar_url.replace(
          process.env.R2_PUBLIC_URL + "/",
          "",
        );
        R2Service.deleteFromPublicBucket(key).catch(() => {});
      } else if (!profile.avatar_url.startsWith("http")) {
        R2Service.deleteFile(profile.avatar_url).catch(() => {});
      }
    }

    return res.json({ success: true, message: "Profile photo removed" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to remove avatar" });
  }
});

module.exports = router;
