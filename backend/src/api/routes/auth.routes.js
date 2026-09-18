// src/api/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const {
  sendMobileOtp,
  verifyMobileOtp,
  sendEmailVerificationCode,
  verifyEmailAndRegister,
  reactivateAccount,
} = require("../controllers/auth.controller"); // 💡 Aligned names perfectly with your controller!
const supabase = require("../../config/supabase");

const authRateLimiter = require("../middlewares/rateLimiter");
// const authMiddleware = require("../middlewares/authMiddleware");
const { verifyAuthSession } = require("../middlewares/authMiddleware");

// POST /api/auth/logout
router.post("/logout", verifyAuthSession, async (req, res) => {
  try {
    await supabase
      .from("profiles")
      .update({ fcm_token: null, app_session_id: null })
      .eq("id", req.user.id);
    return res.json({ success: true });
  } catch (_) {
    return res.json({ success: true }); // Fail silently — logout always succeeds
  }
});

// 📱 Phone Verification Routes
router.post("/send-otp", sendMobileOtp);
router.post("/verify-otp", verifyMobileOtp);

// 📧 Email Verification Routes
router.post("/send-email-otp", sendEmailVerificationCode);
router.post("/verify-email-register", verifyEmailAndRegister);

router.post("/reactivate", authRateLimiter, reactivateAccount);

module.exports = router;
