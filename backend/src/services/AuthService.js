const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");
const supabase = require("../config/supabase.js");
const { sendWhatsAppOTP } = require("../utils/otpProvider");

const resend = new Resend(process.env.RESEND_API_KEY);
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ─────────────────────────────────────
// helper — get commission rate from account type
// ─────────────────────────────────────
const getCommissionRate = (account_type) => {
  return account_type === "student" ? 20.0 : 12.0;
};

// ─────────────────────────────────────
// STAGE 1A — Send phone OTP
// ─────────────────────────────────────
const sendOtp = async (phone) => {
  // Check if banned
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("phone", phone)
    .maybeSingle();

  if (profile?.is_banned && profile?.deletion_type === "admin_banned") {
    throw new Error("ACCOUNT_BANNED");
  }

  // Rate limit — max 3 OTPs per 10 minutes per phone
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("otps")
    .select("*", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", tenMinutesAgo);

  if (count >= 3) throw new Error("RATE_LIMIT_EXCEEDED");

  const otpCode = generateOTP();
  const hashedCode = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: dbError } = await supabase.from("otps").insert({
    phone,
    code: hashedCode,
    expires_at: expiresAt,
    is_used: false,
    attempts: 0,
  });

  if (dbError) throw dbError;

  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] OTP for ${phone}: ${otpCode}`);
  } else {
    await sendWhatsAppOTP(phone, otpCode);
  }

  return true;
};

// ─────────────────────────────────────
// STAGE 1B — Verify phone OTP
// ─────────────────────────────────────
const verifyOtp = async (phone, code) => {
  const { data: otpRecord, error } = await supabase
    .from("otps")
    .select("*")
    .eq("phone", phone)
    .eq("is_used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !otpRecord) throw new Error("OTP_NOT_FOUND");
  if (otpRecord.attempts >= 5) throw new Error("MAX_ATTEMPTS");
  if (Date.now() > new Date(otpRecord.expires_at).getTime())
    throw new Error("OTP_EXPIRED");

  const isMatch = await bcrypt.compare(code, otpRecord.code);
  if (!isMatch) {
    await supabase
      .from("otps")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);
    throw new Error("OTP_INVALID");
  }

  // Mark OTP as used
  await supabase.from("otps").update({ is_used: true }).eq("id", otpRecord.id);

  // Check if fully registered profile exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existingProfile) {
    // Check if account is deleted (self-deleted only, not admin banned)
    if (
      existingProfile.is_deleted &&
      existingProfile.deletion_type === "self_deleted"
    ) {
      // Issue a reactivation token — requires email OTP next
      const reactivationToken = jwt.sign(
        { phone, user_id: existingProfile.id, purpose: "reactivation" },
        process.env.JWT_SECRET,
        { expiresIn: "30m" },
      );
      return {
        isNewUser: false,
        requiresReactivation: true,
        reactivationToken,
      };
    }

    // Admin banned — block completely
    if (
      existingProfile.is_deleted &&
      existingProfile.deletion_type === "admin_banned"
    ) {
      throw new Error("ACCOUNT_PERMANENTLY_SUSPENDED");
    }

    // Normal existing user login
    const token = jwt.sign(
      {
        id: existingProfile.id,
        phone: existingProfile.phone,
        account_type: existingProfile.account_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );
    return { isNewUser: false, token, user: existingProfile };
  }

  // New user — clean up any ghost auth users for this phone before proceeding
  // This handles the case where someone abandoned registration halfway
  const { data: ghostUsers } = await supabase.auth.admin.listUsers();
  if (ghostUsers?.users) {
    const ghost = ghostUsers.users.find((u) => u.phone === phone && !u.email);
    if (ghost) {
      await supabase.auth.admin.deleteUser(ghost.id);
      console.log(`[CLEANUP] Deleted ghost auth user for phone ${phone}`);
    }
  }

  // Issue short-lived registration token
  const registrationToken = jwt.sign(
    { phone, phone_verified: true },
    process.env.JWT_SECRET,
    { expiresIn: "30m" },
  );
  return { isNewUser: true, registrationToken };
};

// ─────────────────────────────────────
// STAGE 2A — Send email OTP
// ─────────────────────────────────────
const sendEmailOtp = async (registrationToken, email) => {
  // Validate registration token
  let decoded;
  try {
    decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error("REGISTRATION_TOKEN_EXPIRED");
  }

  // Check email not already taken by a complete profile
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, phone")
    .eq("email", email)
    .maybeSingle();

  // Only block if the existing profile has a DIFFERENT phone
  // Same phone means they're retrying — allow it
  if (existing && existing.phone !== decoded.phone) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  // Delete any previous unused email OTPs for this email
  await supabase
    .from("email_otps")
    .delete()
    .eq("email", email)
    .eq("is_used", false);

  const otpCode = generateOTP();
  const hashedCode = await bcrypt.hash(otpCode, 10);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { error: dbError } = await supabase.from("email_otps").insert({
    email,
    code: hashedCode,
    expires_at: expiresAt,
    is_used: false,
    attempts: 0,
  });

  if (dbError) throw dbError;

  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV] Email OTP for ${email}: ${otpCode}`);
    return true;
  }

  const { error: resendError } = await resend.emails.send({
    from: `EduCrit <${process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"}>`,
    to: [email],
    subject: "Verify your email — EduCrit",
    html: `
      <div style="font-family:sans-serif;max-width:480px;padding:24px;
                  border:1px solid #e2e8f0;border-radius:12px;margin:auto">
        <h2 style="color:#4F46E5;margin-top:0">Verify your email</h2>
        <p>Your EduCrit verification code is:</p>
        <h1 style="background:#f8fafc;padding:14px;text-align:center;
                   letter-spacing:8px;border:1px solid #e2e8f0;
                   border-radius:8px;color:#0f172a">${otpCode}</h1>
        <p style="font-size:12px;color:#64748b;margin-top:16px">
          Expires in 15 minutes. Do not share this code with anyone.
        </p>
      </div>
    `,
  });

  if (resendError) throw resendError;
  return true;
};

// ─────────────────────────────────────
// STAGE 2B — Verify email OTP + create account
// ─────────────────────────────────────
const completeEmailVerification = async (
  registrationToken,
  email,
  code,
  registrationData,
) => {
  const { account_type } = registrationData;

  // ── Validate account type ──
  if (!["student", "business", "youtube"].includes(account_type)) {
    throw new Error("INVALID_ACCOUNT_TYPE");
  }

  // ── Validate required fields per account type ──
  if (account_type === "student") {
    if (!registrationData.name?.trim()) throw new Error("NAME_REQUIRED");
    // college is optional for students — they can add later in profile

    if (!registrationData.college || !registrationData.college.trim()) {
      throw new Error("COLLEGE_REQUIRED_FOR_STUDENTS");
    }
  }

  if (account_type === "business") {
    if (!registrationData.business_name?.trim())
      throw new Error("BUSINESS_NAME_REQUIRED");
    if (!registrationData.owner_full_name?.trim())
      throw new Error("OWNER_NAME_REQUIRED");
    if (!registrationData.owner_dob) throw new Error("OWNER_DOB_REQUIRED");
    if (!registrationData.pan_number?.trim()) throw new Error("PAN_REQUIRED");
    if (!registrationData.business_address?.trim())
      throw new Error("ADDRESS_REQUIRED");
    if (!registrationData.gstin_number?.trim())
      throw new Error("GSTIN_REQUIRED");
    if (!registrationData.upi_id?.trim()) throw new Error("UPI_REQUIRED");
  }

  if (account_type === "youtube") {
    if (!registrationData.channel_name?.trim())
      throw new Error("CHANNEL_NAME_REQUIRED");
    if (!registrationData.owner_full_name?.trim())
      throw new Error("OWNER_NAME_REQUIRED");
    if (!registrationData.owner_dob) throw new Error("OWNER_DOB_REQUIRED");
    if (!registrationData.pan_number?.trim()) throw new Error("PAN_REQUIRED");
    if (!registrationData.upi_id?.trim()) throw new Error("UPI_REQUIRED");
  }

  // ── Verify registration token ──
  let decoded;
  try {
    decoded = jwt.verify(registrationToken, process.env.JWT_SECRET);
  } catch (err) {
    throw new Error("REGISTRATION_TOKEN_EXPIRED");
  }
  const phone = decoded.phone;

  // ── Verify email OTP ──
  const { data: otpRecord, error } = await supabase
    .from("email_otps")
    .select("*")
    .eq("email", email)
    .eq("is_used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !otpRecord) throw new Error("EMAIL_OTP_NOT_FOUND");
  if (otpRecord.attempts >= 5) throw new Error("EMAIL_MAX_ATTEMPTS");
  if (Date.now() > new Date(otpRecord.expires_at).getTime())
    throw new Error("EMAIL_OTP_EXPIRED");

  const isMatch = await bcrypt.compare(code, otpRecord.code);
  if (!isMatch) {
    await supabase
      .from("email_otps")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);
    throw new Error("EMAIL_OTP_INVALID");
  }

  // ── Mark email OTP used ──
  await supabase
    .from("email_otps")
    .update({ is_used: true })
    .eq("id", otpRecord.id);

  // ── Build extra_details and primary name per account type ──
  let extraDetails = {};
  let primaryName = "";

  if (account_type === "student") {
    primaryName = registrationData.name.trim();
    extraDetails = { college: registrationData.college?.trim() || null };
  }

  if (account_type === "business") {
    primaryName = registrationData.business_name.trim();
    extraDetails = {
      owner_full_name: registrationData.owner_full_name.trim(),
      owner_dob: registrationData.owner_dob,
      pan_number: registrationData.pan_number.trim().toUpperCase(),
      business_address: registrationData.business_address.trim(),
      gstin_number: registrationData.gstin_number.trim().toUpperCase(),
      upi_id: registrationData.upi_id.trim(),
    };
  }

  if (account_type === "youtube") {
    primaryName = registrationData.channel_name.trim();
    extraDetails = {
      owner_full_name: registrationData.owner_full_name.trim(),
      owner_dob: registrationData.owner_dob,
      pan_number: registrationData.pan_number.trim().toUpperCase(),
      upi_id: registrationData.upi_id.trim(),
    };
  }

  // ── Check if profile already exists for this phone (retry scenario) ──
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();

  if (existingProfile) {
    // Profile exists — update it with the new details and verified status
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({
        email,
        name: primaryName,
        account_type,
        extra_details: extraDetails,
        phone_verified: true,
        email_verified: true,
        is_seller: account_type !== "student",
        verification_status:
          account_type === "student" ? "approved" : "pending",
      })
      .eq("id", existingProfile.id)
      .select()
      .single();

    if (updateError) throw updateError;

    const token = jwt.sign(
      {
        id: updatedProfile.id,
        phone: updatedProfile.phone,
        account_type: updatedProfile.account_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );
    return { token, user: updatedProfile };
  }

  // ── Create new Supabase Auth user ──
  // The trigger will auto-create the profiles row
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      phone,
      password: crypto.randomBytes(16).toString("hex"),
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        name: primaryName,
        account_type: account_type === "youtube" ? "creator" : account_type,
        extra_details: extraDetails,
      },
    });

  if (authError) {
    if (
      authError.message.toLowerCase().includes("already") ||
      authError.message.toLowerCase().includes("exists")
    ) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
    throw authError;
  }

  // ── Wait for trigger to fire ──
  await new Promise((resolve) => setTimeout(resolve, 600));

  // ── Fetch the auto-created profile ──
  const { data: newProfile, error: fetchError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (fetchError || !newProfile) {
    // Trigger may have failed — create profile manually as fallback
    const { data: manualProfile, error: manualError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        email,
        phone,
        name: primaryName,
        account_type,
        extra_details: extraDetails,
        phone_verified: true,
        email_verified: true,
        is_seller: account_type !== "student",
        is_banned: false,
        verification_status:
          account_type === "student" ? "approved" : "pending",
      })
      .select()
      .single();

    if (manualError) throw manualError;

    const token = jwt.sign(
      {
        id: manualProfile.id,
        phone: manualProfile.phone,
        account_type: manualProfile.account_type,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" },
    );
    return { token, user: manualProfile };
  }

  // ── Issue session JWT ──
  const token = jwt.sign(
    {
      id: newProfile.id,
      phone: newProfile.phone,
      account_type: newProfile.account_type,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" },
  );

  return { token, user: newProfile };
};

const reactivateAccount = async (reactivationToken, email, code) => {
  // Verify reactivation token
  let decoded;
  try {
    decoded = jwt.verify(reactivationToken, process.env.JWT_SECRET);
  } catch {
    throw new Error("REACTIVATION_TOKEN_EXPIRED");
  }

  if (decoded.purpose !== "reactivation") throw new Error("INVALID_TOKEN");

  const userId = decoded.user_id;

  // Verify email OTP
  const { data: otpRecord } = await supabase
    .from("email_otps")
    .select("*")
    .eq("email", email)
    .eq("is_used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRecord) throw new Error("EMAIL_OTP_NOT_FOUND");
  if (otpRecord.attempts >= 5) throw new Error("EMAIL_MAX_ATTEMPTS");
  if (Date.now() > new Date(otpRecord.expires_at).getTime())
    throw new Error("EMAIL_OTP_EXPIRED");

  const isMatch = await bcrypt.compare(code, otpRecord.code);
  if (!isMatch) {
    await supabase
      .from("email_otps")
      .update({ attempts: otpRecord.attempts + 1 })
      .eq("id", otpRecord.id);
    throw new Error("EMAIL_OTP_INVALID");
  }

  await supabase
    .from("email_otps")
    .update({ is_used: true })
    .eq("id", otpRecord.id);

  // Check no pending settlement
  const { data: wallet } = await supabase
    .from("wallets")
    .select("pending_payout")
    .eq("user_id", userId)
    .maybeSingle();

  if (wallet && parseFloat(wallet.pending_payout) > 0) {
    throw new Error("PENDING_SETTLEMENT_REQUIRED");
  }

  // Restore account
  await supabase
    .from("profiles")
    .update({ is_deleted: false, is_banned: false, deletion_type: null })
    .eq("id", userId);

  // Restore their notes
  await supabase
    .from("notes")
    .update({ is_deleted: false, status: "pending" }) // re-review after reactivation
    .eq("seller_id", userId);

  // Issue new session token
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const token = jwt.sign(
    {
      id: profile.id,
      phone: profile.phone,
      account_type: profile.account_type,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30d" },
  );

  return { token, user: profile };
};

module.exports = {
  sendOtp,
  verifyOtp,
  sendEmailOtp,
  completeEmailVerification,
  getCommissionRate,
  reactivateAccount,
};
