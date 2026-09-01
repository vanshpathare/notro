const authService = require("../../services/AuthService");
const logger = require("../../utils/logger");

const sendMobileOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone)
      return res.status(400).json({ error: "Phone number is required" });
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res
        .status(400)
        .json({ error: "Enter a valid 10-digit Indian mobile number" });
    }
    await authService.sendOtp(phone);
    return res.json({ success: true, message: "OTP sent via WhatsApp" });
  } catch (err) {
    logger.error(`sendMobileOtp | ${req.body.phone} | ${err.message}`);

    if (err.cause) {
      console.error("🔍 Real Outbound Failure Cause:", err.cause);
    }

    if (err.message === "ACCOUNT_BANNED")
      return res.status(403).json({ error: "Account suspended" });
    if (err.message === "RATE_LIMIT_EXCEEDED")
      return res
        .status(429)
        .json({ error: "Too many OTP requests. Wait 10 minutes." });
    return res.status(500).json({ error: "Failed to send OTP" });
  }
};

const verifyMobileOtp = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code)
      return res.status(400).json({ error: "Phone and code are required" });

    const result = await authService.verifyOtp(phone, code);

    // Account needs reactivation — send to email OTP step
    if (result.requiresReactivation) {
      return res.json({
        success: true,
        requiresReactivation: true,
        reactivationToken: result.reactivationToken,
        message:
          "Phone verified. Please verify your email to reactivate your account.",
      });
    }

    if (!result.isNewUser) {
      res.cookie("token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      return res.json({
        success: true,
        isNewUser: false,
        token: result.token,
        user: result.user,
      });
    }

    return res.json({
      success: true,
      isNewUser: true,
      registrationToken: result.registrationToken,
    });
  } catch (err) {
    logger.error(`verifyMobileOtp | ${req.body.phone} | ${err.message}`);
    const map = {
      OTP_NOT_FOUND: [400, "No active OTP found for this number"],
      MAX_ATTEMPTS: [429, "Too many wrong attempts. Request a new OTP."],
      OTP_EXPIRED: [400, "OTP has expired. Request a new one."],
      OTP_INVALID: [400, "Incorrect OTP code"],
      ACCOUNT_PERMANENTLY_SUSPENDED: [
        403,
        "This account has been suspended. Contact support@educrit.in",
      ],
    };
    const [status, message] = map[err.message] || [500, "Verification failed"];
    return res.status(status).json({ error: message });
  }
};

const sendEmailVerificationCode = async (req, res) => {
  try {
    const { registrationToken, email } = req.body;
    if (!registrationToken || !email) {
      return res
        .status(400)
        .json({ error: "Registration token and email are required" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    await authService.sendEmailOtp(registrationToken, email);
    return res.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (err) {
    logger.error(`sendEmailOtp | ${req.body.email} | ${err.message}`);
    if (err.message === "REGISTRATION_TOKEN_EXPIRED") {
      return res
        .status(401)
        .json({ error: "Session expired. Please restart registration." });
    }
    if (err.message === "EMAIL_ALREADY_EXISTS") {
      return res
        .status(409)
        .json({ error: "This email is already registered to another account" });
    }
    return res.status(500).json({ error: "Failed to send email OTP" });
  }
};

const verifyEmailAndRegister = async (req, res) => {
  try {
    const { registrationToken, email, code, registrationData } = req.body;

    if (
      !registrationToken ||
      !email ||
      !code ||
      !registrationData ||
      !registrationData.account_type
    ) {
      return res
        .status(400)
        .json({ error: "All registration fields are required" });
    }

    const result = await authService.completeEmailVerification(
      registrationToken,
      email,
      code,
      registrationData,
    );

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res
      .status(201)
      .json({ success: true, token: result.token, user: result.user });
  } catch (err) {
    logger.error(`verifyEmailAndRegister | ${req.body.email} | ${err.message}`);
    const map = {
      INVALID_ACCOUNT_TYPE: [400, "Invalid account type selected"],
      NAME_REQUIRED: [400, "Name is required"],
      COLLEGE_REQUIRED_FOR_STUDENTS: [
        400,
        "College name is mandatory for student registration.",
      ],
      BUSINESS_NAME_REQUIRED: [400, "Business name is required"],
      OWNER_NAME_REQUIRED: [400, "Owner full name is required"],
      OWNER_DOB_REQUIRED: [400, "Owner date of birth is required"],
      PAN_REQUIRED: [400, "PAN card number is required"],
      ADDRESS_REQUIRED: [400, "Business address is required"],
      GSTIN_REQUIRED: [400, "GSTIN or Udyam number is required"],
      UPI_REQUIRED: [400, "UPI ID is required"],
      CHANNEL_NAME_REQUIRED: [400, "YouTube channel name is required"],
      REGISTRATION_TOKEN_EXPIRED: [
        401,
        "Session expired. Please restart registration.",
      ],
      EMAIL_OTP_NOT_FOUND: [
        400,
        "No active email OTP found. Request a new one.",
      ],
      EMAIL_MAX_ATTEMPTS: [429, "Too many wrong attempts. Request a new code."],
      EMAIL_OTP_EXPIRED: [400, "Email OTP has expired. Request a new one."],
      EMAIL_OTP_INVALID: [400, "Incorrect email verification code"],
      EMAIL_ALREADY_EXISTS: [409, "This email is already registered"],
    };
    const [status, message] = map[err.message] || [
      500,
      "Registration failed. Please try again.",
    ];
    return res.status(status).json({ error: message });
  }
};

const reactivateAccount = async (req, res) => {
  try {
    const { reactivationToken, email, code } = req.body;
    if (!reactivationToken || !email || !code) {
      return res
        .status(400)
        .json({ error: "reactivationToken, email and code are required" });
    }

    const result = await authService.reactivateAccount(
      reactivationToken,
      email,
      code,
    );

    res.cookie("token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Welcome back! Your account has been reactivated.",
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    logger.error(`reactivateAccount | ${err.message}`);
    const map = {
      REACTIVATION_TOKEN_EXPIRED: [
        401,
        "Session expired. Please start login again.",
      ],
      INVALID_TOKEN: [400, "Invalid reactivation token"],
      EMAIL_OTP_NOT_FOUND: [400, "No active email OTP found"],
      EMAIL_MAX_ATTEMPTS: [429, "Too many wrong attempts"],
      EMAIL_OTP_EXPIRED: [400, "Email OTP expired"],
      EMAIL_OTP_INVALID: [400, "Incorrect email code"],
      PENDING_SETTLEMENT_REQUIRED: [
        400,
        "Pending balance under audit. Contact support@educrit.in",
      ],
    };
    const [status, message] = map[err.message] || [500, "Reactivation failed"];
    return res.status(status).json({ error: message });
  }
};

module.exports = {
  sendMobileOtp,
  verifyMobileOtp,
  sendEmailVerificationCode,
  verifyEmailAndRegister,
  reactivateAccount,
};
