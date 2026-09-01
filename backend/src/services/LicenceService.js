const supabase = require("../config/supabase.js");

// ─────────────────────────────────────
// Licence check — called every time the Android app opens a PDF
// ─────────────────────────────────────
const checkLicence = async (userId, noteId) => {
  // Note query — do NOT filter by is_deleted here
  // Buyers must keep access even after a note is soft-deleted
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("id, seller_id, status")
    .eq("id", noteId)
    .single(); // ← no is_deleted filter — intentional

  if (noteError || !note) {
    return { valid: false, reason: "NOTE_NOT_FOUND" };
  }

  if (note.seller_id === userId) {
    return {
      valid: true,
      reason: "OWNER",
      checkedAt: new Date().toISOString(),
    };
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("buyer_id", userId)
    .eq("note_id", noteId)
    .eq("status", "paid")
    .maybeSingle();

  if (purchaseError) throw purchaseError;

  if (!purchase) {
    return { valid: false, reason: "NOT_PURCHASED" };
  }

  const { data: user } = await supabase
    .from("profiles")
    .select("is_banned")
    .eq("id", userId)
    .single();

  if (user?.is_banned) {
    return { valid: false, reason: "ACCOUNT_BANNED" };
  }

  return {
    valid: true,
    reason: "PURCHASED",
    checkedAt: new Date().toISOString(),
  };
};

module.exports = { checkLicence };
