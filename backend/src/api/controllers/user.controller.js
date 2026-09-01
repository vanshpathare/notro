const supabase = require("../../config/supabase.js");
const logger = require("../../utils/logger");
const SellerService = require("../../services/SellerService");
const UserService = require("../../services/UserService");
const NoteService = require("../../services/NoteService");

const getMyProfile = async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error) throw error;

    // Fetch wallet if seller
    let wallet = null;
    if (profile.is_seller) {
      const { data: w } = await supabase
        .from("wallets")
        .select("total_earned, pending_payout, total_paid_out")
        .eq("user_id", req.user.id)
        .maybeSingle();
      wallet = w;
    }

    return res.json({ success: true, user: { ...profile, wallet } });
  } catch (err) {
    logger.error(`getMyProfile | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
};

const updateMyProfile = async (req, res) => {
  // Add at the start of updateMyProfile controller:
  console.log("Profile update payload:", JSON.stringify(req.body));
  try {
    const userId = req.user.id;
    const updates = req.body;

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("account_type, verification_status, extra_details")
      .eq("id", userId)
      .single();

    if (fetchError || !profile) throw fetchError;

    // Business and YouTube fully locked after approval
    if (
      profile.account_type !== "student" &&
      profile.verification_status === "approved"
    ) {
      return res.status(403).json({
        error:
          "Verified accounts cannot be self-edited. Contact support@educrit.in",
      });
    }

    if (updates.college !== undefined) {
      updates.extra_details = {
        ...(profile.extra_details || {}),
        college: updates.college ? updates.college.trim() : null,
      };
      delete updates.college; // Remove top-level 'college' key since database uses extra_details
    }

    // Students can only edit these fields
    if (profile.account_type === "student") {
      const allowed = [
        "name",
        "avatar_url",
        "fcm_token",
        "extra_details",
        "mute_sale_notifications",
      ];
      const blocked = Object.keys(updates).filter((f) => !allowed.includes(f));
      if (blocked.length > 0) {
        return res.status(403).json({
          error: `These fields cannot be edited: ${blocked.join(", ")}`,
        });
      }
    }

    // Never allow these fields to be changed by anyone through this endpoint
    const neverAllowed = [
      "id",
      "phone",
      "email",
      "account_type",
      "is_banned",
      "verification_status",
      "is_seller",
      "created_at",
    ];
    const violation = Object.keys(updates).filter((f) =>
      neverAllowed.includes(f),
    );
    if (violation.length > 0) {
      return res.status(403).json({
        error: `Cannot modify: ${violation.join(", ")}`,
      });
    }

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    // if (updateError) throw updateError;
    if (updateError) {
      console.error("Supabase update error:", updateError.message); // 👈 Add this
      throw updateError;
    }

    console.log("Successfully updated user profile:", updated);
    return res.json({ success: true, user: updated });
  } catch (err) {
    logger.error(`updateMyProfile | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

const becomeSeller = async (req, res) => {
  try {
    const { upiId } = req.body;
    const updated = await SellerService.becomeSeller(req.user.id, upiId);
    return res.json({
      success: true,
      message: "You are now a seller",
      user: updated,
    });
  } catch (err) {
    logger.error(`becomeSeller | ${req.user?.id} | ${err.message}`);
    const map = {
      UPI_ID_REQUIRED: [400, "UPI ID is required to become a seller"],
      USER_NOT_FOUND: [404, "User not found"],
      ALREADY_SELLER: [409, "You are already a seller"],
      NOT_APPLICABLE: [400, "This action is only for student accounts"],
    };
    const [status, message] = map[err.message] || [
      500,
      "Failed to update account",
    ];
    return res.status(status).json({ error: message });
  }
};

// DELETE /api/users/me — soft delete account
const deleteMyAccount = async (req, res) => {
  try {
    const result = await UserService.deleteMyAccount(req.user.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`deleteMyAccount | ${req.user?.id} | ${err.message}`);
    if (err.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(500).json({ error: "Failed to delete account" });
  }
};

// DELETE /api/notes/:id — soft delete a note
const deleteNote = async (req, res) => {
  try {
    const result = await NoteService.softDeleteNote(req.params.id, req.user.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`deleteNote | ${req.params.id} | ${err.message}`);
    const map = {
      NOTE_NOT_FOUND: [404, "Note not found"],
      NOT_YOUR_NOTE: [403, "You can only delete your own notes"],
    };
    const [status, message] = map[err.message] || [
      500,
      "Failed to delete note",
    ];
    return res.status(status).json({ error: message });
  }
};

const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken?.trim()) {
      return res.status(400).json({ error: "fcmToken is required" });
    }

    const sanitizedToken = fcmToken.trim();

    // 1. CLEAR STALE TOKENS: If this token is currently attached to ANY other
    // user profile, set it to null to avoid cross-device/cross-account spamming.
    await supabase
      .from("profiles")
      .update({ fcm_token: null })
      .eq("fcm_token", sanitizedToken)
      .neq("id", req.user.id); // Don't wipe it if it already belongs to this user

    // 2. ASSIGN NEW TOKEN: Update the current authenticated user's profile
    const { error } = await supabase
      .from("profiles")
      .update({ fcm_token: sanitizedToken })
      .eq("id", req.user.id);

    if (error) throw error;

    return res.json({
      success: true,
      message: "FCM token updated successfully",
    });
  } catch (err) {
    logger.error(`updateFcmToken | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to update FCM token" });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  becomeSeller,
  deleteMyAccount,
  deleteNote,
  updateFcmToken,
};
