const supabase = require("../../config/supabase.js");
const logger = require("../../utils/logger");

const getMyProfile = async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (error) throw error;
    return res.json({ success: true, user: profile });
  } catch (err) {
    logger.error(`getMyProfile | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
};

const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("account_type, verification_status")
      .eq("id", userId)
      .single();

    if (fetchError) throw fetchError;

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

    // Students can only edit these fields
    if (profile.account_type === "student") {
      const allowed = ["name", "avatar_url", "fcm_token", "extra_details"];
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

    if (updateError) throw updateError;
    return res.json({ success: true, user: updated });
  } catch (err) {
    logger.error(`updateMyProfile | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

module.exports = { getMyProfile, updateMyProfile };
