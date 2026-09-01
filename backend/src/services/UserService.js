const supabase = require("../config/supabase.js");

// ─────────────────────────────────────
// Get own profile
// ─────────────────────────────────────
const getMyProfile = async (userId) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !profile) throw new Error("USER_NOT_FOUND");

  // Get wallet if seller
  let wallet = null;
  if (profile.is_seller) {
    const { data: w } = await supabase
      .from("wallets")
      .select("total_earned, pending_payout, total_paid_out")
      .eq("user_id", userId)
      .maybeSingle();
    wallet = w;
  }

  return { ...profile, wallet };
};

// ─────────────────────────────────────
// Update own profile
// ─────────────────────────────────────
const updateMyProfile = async (userId, updates) => {
  // Fetch current profile to check locks
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("account_type, verification_status")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) throw new Error("USER_NOT_FOUND");

  // Business and YouTube — fully locked after approval
  if (
    profile.account_type !== "student" &&
    profile.verification_status === "approved"
  ) {
    throw new Error("PROFILE_LOCKED");
  }

  // Fields nobody can self-edit regardless of account type
  const neverAllowed = [
    "id",
    "phone",
    "email",
    "account_type",
    "is_banned",
    "verification_status",
    "is_seller",
    "created_at",
    "updated_at",
  ];

  const blocked = Object.keys(updates).filter((f) => neverAllowed.includes(f));
  if (blocked.length > 0) throw new Error("FIELD_NOT_EDITABLE");

  // Students can only edit these fields
  if (profile.account_type === "student") {
    const allowed = ["name", "avatar_url", "fcm_token", "extra_details"];
    const studentBlocked = Object.keys(updates).filter(
      (f) => !allowed.includes(f),
    );
    if (studentBlocked.length > 0) throw new Error("FIELD_NOT_EDITABLE");
  }

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;
  return updated;
};

// Soft delete account — never hard delete if seller has purchases

// Soft delete account — updated to save deletion type context
const deleteMyAccount = async (userId) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_seller")
    .eq("id", userId)
    .single();

  if (!profile) throw new Error("USER_NOT_FOUND");

  const updatePayload = {
    is_deleted: true,
    is_banned: true,
    deletion_type: "self_deleted",
  };

  if (profile.is_seller) {
    const { count } = await supabase
      .from("purchases")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", userId)
      .eq("status", "paid");

    if (count > 0) {
      await supabase.from("profiles").update(updatePayload).eq("id", userId);
      await supabase
        .from("notes")
        .update({ is_deleted: true })
        .eq("seller_id", userId);

      return {
        type: "soft",
        message:
          "Account deactivated. Existing buyers retain access to purchased notes.",
      };
    }
  }

  await supabase.from("profiles").update(updatePayload).eq("id", userId);
  return {
    type: "soft",
    message: "Account successfully deleted.",
  };
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
};
