// src/api/routes/auth.routes.js

const express = require("express");
const router = express.Router();
const {
  sendMobileOtp,
  verifyMobileOtp,
  sendEmailVerificationCode,
  verifyEmailAndRegister,
} = require("../controllers/auth.controller"); // 💡 Aligned names perfectly with your controller!

const authRateLimiter = require("../middlewares/rateLimiter");

// 📱 Phone Verification Routes
router.post("/send-otp", sendMobileOtp);
router.post("/verify-otp", verifyMobileOtp);

// 📧 Email Verification Routes
router.post("/send-email-otp", sendEmailVerificationCode);
router.post("/verify-email-register", verifyEmailAndRegister);

module.exports = router;
