const supabase = require("../config/supabase.js");

// ─────────────────────────────────────
// Submit a content report
// ─────────────────────────────────────
const submitReport = async (reporterId, noteId, reason, description) => {
  const validReasons = [
    "copyright",
    "blank_pdf",
    "inappropriate",
    "spam",
    "misleading",
  ];
  if (!validReasons.includes(reason)) throw new Error("INVALID_REASON");

  // Check note exists
  const { data: note } = await supabase
    .from("notes")
    .select("id")
    .eq("id", noteId)
    .single();

  if (!note) throw new Error("NOTE_NOT_FOUND");

  // Check not already reported by same user for same note
  const { data: existing } = await supabase
    .from("content_reports")
    .select("id")
    .eq("reporter_id", reporterId)
    .eq("note_id", noteId)
    .maybeSingle();

  if (existing) throw new Error("ALREADY_REPORTED");

  const { data: report, error } = await supabase
    .from("content_reports")
    .insert({
      reporter_id: reporterId,
      note_id: noteId,
      reason,
      description: description?.trim() || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return report;
};

// ─────────────────────────────────────
// ADMIN — get all pending reports
// ─────────────────────────────────────
const getPendingReports = async () => {
  const { data, error } = await supabase
    .from("content_reports")
    .select(
      `
      *,
      note:notes ( id, title, subject, seller_id ),
      reporter:profiles!reporter_id ( name, phone )
    `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
};

// ─────────────────────────────────────
// ADMIN — action a report
// ─────────────────────────────────────
const actionReport = async (reportId, action, adminNote) => {
  const validActions = ["reviewed", "actioned", "dismissed"];
  if (!validActions.includes(action)) throw new Error("INVALID_ACTION");

  const { data: report, error: fetchError } = await supabase
    .from("content_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (fetchError || !report) throw new Error("REPORT_NOT_FOUND");

  const { data: updated, error } = await supabase
    .from("content_reports")
    .update({ status: action })
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;

  // If actioned — take down the note automatically
  if (action === "actioned") {
    await supabase
      .from("notes")
      .update({
        status: "rejected",
        rejection_reason: `Removed following content report: ${report.reason}`,
      })
      .eq("id", report.note_id);
  }

  return updated;
};

module.exports = { submitReport, getPendingReports, actionReport };
