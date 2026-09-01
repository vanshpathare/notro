const express = require("express");
const router = express.Router();
const adminAuth = require("../middlewares/adminMiddleware");
const supabase = require("../../config/supabase.js");
const R2Service = require("../../services/R2Service");
const WithdrawalService = require("../../services/WithdrawalService");
const ReportService = require("../../services/ReportService");
const { notifyFollowersOfNewNote } = require("../../services/NoteService");
const {
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const r2Client = require("../../config/r2.js");

router.use(adminAuth);

// ══════════════════════════════════════
// NOTES MODERATION
// ══════════════════════════════════════

// GET /admin/notes/pending
router.get("/notes/pending", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notes")
      .select(
        `
        id, title, subject, course, price,
        page_count, created_at, r2_key,
        seller:profiles!seller_id ( id, name, account_type, phone )
      `,
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return res.json({ success: true, notes: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /admin/notes/view/:noteId — presigned URL to view PDF
router.get("/notes/view/:noteId", async (req, res) => {
  try {
    const { data: note, error } = await supabase
      .from("notes")
      .select("r2_key, title, status")
      .eq("id", req.params.noteId)
      .single();

    if (error || !note)
      return res.status(404).json({ error: "Note not found" });

    const url = await R2Service.generateDownloadUrl(note.r2_key);
    return res.json({ success: true, url, title: note.title, expiresIn: 60 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/notes/approve/:noteId
router.patch("/notes/approve/:noteId", async (req, res) => {
  try {
    const { error } = await supabase
      .from("notes")
      .update({ status: "approved" })
      .eq("id", req.params.noteId);

    if (error) throw error;
    return res.json({ success: true, message: "Note approved and now live" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/notes/reject/:noteId
router.patch("/notes/reject/:noteId", async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const { error } = await supabase
      .from("notes")
      .update({
        status: "rejected",
        rejection_reason: reason.trim(),
      })
      .eq("id", req.params.noteId);

    if (error) throw error;
    return res.json({ success: true, message: "Note rejected" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════
// WITHDRAWAL / PAYOUT MANAGEMENT
// ══════════════════════════════════════

// GET /admin/withdrawals/pending
router.get("/withdrawals/pending", async (req, res) => {
  try {
    const withdrawals = await WithdrawalService.getPendingWithdrawals();
    return res.json({ success: true, withdrawals });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/withdrawals/:id/mark-paid
// After you manually transfer via GPay/PhonePe, call this with the UTR number
router.patch("/withdrawals/:id/mark-paid", async (req, res) => {
  try {
    const { utrNumber } = req.body;
    const result = await WithdrawalService.markAsPaid(req.params.id, utrNumber);
    return res.json({
      success: true,
      message: "Payment confirmed. Seller notified.",
      payout: result,
    });
  } catch (err) {
    const map = {
      REQUEST_NOT_FOUND: [404, "Payout request not found"],
      ALREADY_PROCESSED: [409, "This request was already processed"],
    };
    const [status, message] = map[err.message] || [500, err.message];
    return res.status(status).json({ error: message });
  }
});

// PATCH /admin/withdrawals/:id/reject
router.patch("/withdrawals/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await WithdrawalService.rejectWithdrawal(
      req.params.id,
      reason,
    );
    return res.json({
      success: true,
      message: "Request rejected. Amount returned to seller balance.",
      payout: result,
    });
  } catch (err) {
    const map = {
      REQUEST_NOT_FOUND: [404, "Payout request not found"],
      ALREADY_PROCESSED: [409, "This request was already processed"],
    };
    const [status, message] = map[err.message] || [500, err.message];
    return res.status(status).json({ error: message });
  }
});

// ══════════════════════════════════════
// WALLET AUDIT
// ══════════════════════════════════════

// GET /admin/wallet-check/:sellerId
// Verifies: total_earned = pending_payout + total_paid_out
router.get("/wallet-check/:sellerId", async (req, res) => {
  try {
    const result = await WithdrawalService.verifyWalletIntegrity(
      req.params.sellerId,
    );
    if (!result)
      return res.status(404).json({ error: "No wallet found for this seller" });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════
// CONTENT REPORTS
// ══════════════════════════════════════

// GET /admin/reports/pending
router.get("/reports/pending", async (req, res) => {
  try {
    const reports = await ReportService.getPendingReports();
    return res.json({ success: true, reports });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/reports/:id/action
// action = 'reviewed' | 'actioned' | 'dismissed'
// 'actioned' automatically takes down the note
router.patch("/reports/:id/action", async (req, res) => {
  try {
    const { action, adminNote } = req.body;
    const result = await ReportService.actionReport(
      req.params.id,
      action,
      adminNote,
    );
    return res.json({ success: true, report: result });
  } catch (err) {
    const map = {
      INVALID_ACTION: [400, "Action must be: reviewed, actioned, or dismissed"],
      REPORT_NOT_FOUND: [404, "Report not found"],
    };
    const [status, message] = map[err.message] || [500, err.message];
    return res.status(status).json({ error: message });
  }
});

// PATCH /admin/notes/soft-delete/:noteId
// Admin removing a note — soft delete preserves buyer access
router.patch("/notes/soft-delete/:noteId", async (req, res) => {
  try {
    const { reason } = req.body;

    const { data: note } = await supabase
      .from("notes")
      .select("id")
      .eq("id", req.params.noteId)
      .single();

    if (!note) return res.status(404).json({ error: "Note not found" });

    await supabase
      .from("notes")
      .update({
        is_deleted: true,
        status: "rejected",
        rejection_reason: reason || "Removed by admin",
      })
      .eq("id", req.params.noteId);

    return res.json({
      success: true,
      message: "Note removed. Existing buyers retain access.",
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /admin/orphans/list — see what would be deleted
router.get("/orphans/list", async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const { data: orphans, error } = await supabase
      .from("upload_intents")
      .select("id, seller_id, r2_key, created_at")
      .eq("claimed", false)
      .lt("created_at", cutoff.toISOString());

    if (error) throw error;

    return res.json({
      success: true,
      count: orphans.length,
      total_files: orphans.length,
      orphans,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /admin/orphans/cleanup — actually delete them
router.delete("/orphans/cleanup", async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const { data: orphans, error } = await supabase
      .from("upload_intents")
      .select("id, r2_key")
      .eq("claimed", false)
      .lt("created_at", cutoff.toISOString());

    if (error) throw error;
    if (!orphans || orphans.length === 0) {
      return res.json({
        success: true,
        message: "No orphan files found",
        deleted: 0,
      });
    }

    let deleted = 0;
    let failed = 0;

    for (const orphan of orphans) {
      try {
        // Delete from R2
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: orphan.r2_key,
          }),
        );

        // Delete intent record
        await supabase.from("upload_intents").delete().eq("id", orphan.id);
        deleted++;
      } catch {
        failed++;
      }
    }

    return res.json({
      success: true,
      message: `Cleanup complete. ${deleted} files deleted, ${failed} failed.`,
      deleted,
      failed,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/notes/approve/:noteId", async (req, res) => {
  try {
    const { data: note } = await supabase
      .from("notes")
      .select("id, seller_id")
      .eq("id", req.params.noteId)
      .single();

    if (!note) return res.status(404).json({ error: "Note not found" });

    const { error } = await supabase
      .from("notes")
      .update({ status: "approved" })
      .eq("id", req.params.noteId);

    if (error) throw error;

    // Notify followers — non-blocking
    notifyFollowersOfNewNote(note.id, note.seller_id).catch(() => {});

    return res.json({ success: true, message: "Note approved and now live" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
