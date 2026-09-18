const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

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

// ══════════════════════════════════════
// STEP-UP SECURITY GATE (NO ELEVATED TOKEN REQUIRED YET)
// ══════════════════════════════════════

const gateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many failed attempts. Access locked for 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/admin/verify-gate
// router.post("/verify-gate", gateLimiter, async (req, res) => {
//   try {
//     const { pass1, pass2 } = req.body;

//     // 1. Verify standard authenticated user from cookie or bearer header
//     let token = req.cookies?.token;
//     if (!token && req.headers.authorization?.startsWith("Bearer ")) {
//       token = req.headers.authorization.split(" ")[1];
//     }
//     if (!token) return res.status(404).json({ error: "Endpoint not found" });

//     let decoded;
//     try {
//       decoded = jwt.verify(token, process.env.JWT_SECRET);
//     } catch {
//       return res.status(404).json({ error: "Endpoint not found" });
//     }

//     const userId = decoded.id || decoded.userId || decoded.sub;

//     // 2. Authoritative check: Is this user in ADMIN_PHONES?
//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("id, phone, name")
//       .eq("id", userId)
//       .single();

//     const allowedPhones = (process.env.ADMIN_PHONES || "")
//       .split(",")
//       .map((p) => p.trim());
//     if (!profile || !allowedPhones.includes(profile.phone)) {
//       return res.status(404).json({ error: "Endpoint not found" });
//     }

//     // 3. Validate presence of both 16-character passphrases
//     if (!pass1 || !pass2 || pass1.length < 16 || pass2.length < 16) {
//       return res
//         .status(400)
//         .json({ error: "Both 16-character keys are required." });
//     }

//     // 4. Verify against hashed secrets in .env
//     const match1 = await bcrypt.compare(
//       pass1,
//       process.env.ADMIN_GATE_HASH_1 || "",
//     );
//     const match2 = await bcrypt.compare(
//       pass2,
//       process.env.ADMIN_GATE_HASH_2 || "",
//     );

//     if (!match1 || !match2) {
//       return res.status(404).json({ error: "Endpoint not found" });
//     }

//     // 5. Issue elevated session cookie (valid for 2 hours)
//     const elevatedToken = jwt.sign(
//       { id: profile.id, role: "admin", elevated: true },
//       process.env.JWT_SECRET,
//       { expiresIn: "2h" },
//     );

//     res.cookie("admin_elevated_token", elevatedToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 2 * 60 * 60 * 1000,
//     });

//     return res.json({ success: true, message: "Security clearance verified." });
//   } catch (err) {
//     return res.status(500).json({ error: "Internal server error" });
//   }
// });

router.post("/verify-gate", gateLimiter, async (req, res) => {
  try {
    const { pass1, pass2 } = req.body;

    // 🔍 DEBUG 1: Check token
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    console.log("Gate check - Token exists:", Boolean(token));
    if (!token) return res.status(404).json({ error: "No token found" });

    // 🔍 DEBUG 2: Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      console.log("Gate check - Token invalid:", e.message);
      return res.status(404).json({ error: "Token verification failed" });
    }

    const userId = decoded.id || decoded.userId || decoded.sub;
    console.log("Gate check - User ID from token:", userId);

    // 🔍 DEBUG 3: Phone number matching
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, phone, name")
      .eq("id", userId)
      .single();

    const allowedPhones = (process.env.ADMIN_PHONES || "")
      .split(",")
      .map((p) => p.trim());

    console.log("Gate check - Profile Phone:", profile?.phone);
    console.log("Gate check - Allowed Phones from .env:", allowedPhones);
    console.log(
      "Gate check - Phone Match:",
      allowedPhones.includes(profile?.phone),
    );

    if (!profile || !allowedPhones.includes(profile.phone)) {
      return res
        .status(404)
        .json({ error: "Phone not allowed in ADMIN_PHONES" });
    }

    // 🔍 DEBUG 4: Passphrase hashing check
    const match1 = await bcrypt.compare(
      pass1,
      process.env.ADMIN_GATE_HASH_1 || "",
    );
    const match2 = await bcrypt.compare(
      pass2,
      process.env.ADMIN_GATE_HASH_2 || "",
    );
    console.log("Gate check - Key 1 Match:", match1, "| Key 2 Match:", match2);

    if (!match1 || !match2) {
      return res.status(404).json({ error: "Keys did not match hashes" });
    }

    // Issue elevated session cookie
    const elevatedToken = jwt.sign(
      { id: profile.id, role: "admin", elevated: true },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );

    res.cookie("admin_elevated_token", elevatedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // Use 'lax' for local dev cross-port
      maxAge: 2 * 60 * 60 * 1000,
    });

    return res.json({ success: true, message: "Security clearance verified." });
  } catch (err) {
    console.error("Gate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/logout-gate (Clears elevated session)
router.post("/logout-gate", (req, res) => {
  res.clearCookie("admin_elevated_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res.json({ success: true, message: "Elevated session cleared." });
});

// ══════════════════════════════════════
// ELEVATED ACCESS BARRIER
// ══════════════════════════════════════
// Everything BELOW this line requires the active 2-hour admin_elevated_token
router.use(adminAuth);

// ══════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════

router.get("/stats", async (req, res) => {
  try {
    const [notes, withdrawals, reports, users] = await Promise.all([
      supabase
        .from("notes")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("withdrawal_requests")
        .select("amount")
        .eq("status", "pending"),
      supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const totalPendingPayout = (withdrawals.data || []).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    return res.json({
      success: true,
      stats: {
        pendingNotes: notes.count || 0,
        pendingPayoutCount: withdrawals.data?.length || 0,
        pendingPayoutAmount: totalPendingPayout,
        pendingReports: reports.count || 0,
        totalUsers: users.count || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

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
    const { data: note, error: fetchErr } = await supabase
      .from("notes")
      .select("id, seller_id")
      .eq("id", req.params.noteId)
      .single();

    if (fetchErr || !note)
      return res.status(404).json({ error: "Note not found" });

    const { error: updateErr } = await supabase
      .from("notes")
      .update({ status: "approved" })
      .eq("id", req.params.noteId);

    if (updateErr) throw updateErr;

    // Trigger follower alerts in background
    notifyFollowersOfNewNote(note.id, note.seller_id).catch(() => {});

    return res.json({
      success: true,
      message: "Note approved and published live",
    });
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
        rejection_reason: reason || "Removed by platform admin",
      })
      .eq("id", req.params.noteId);

    return res.json({
      success: true,
      message: "Note delisted. Existing buyers retain access.",
    });
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
    if (!utrNumber?.trim()) {
      return res
        .status(400)
        .json({ error: "UTR transaction number is required" });
    }
    const result = await WithdrawalService.markAsPaid(
      req.params.id,
      utrNumber.trim(),
    );
    return res.json({
      success: true,
      message: "Payment confirmed. Seller notified.",
      payout: result,
    });
  } catch (err) {
    const status = err.message === "ALREADY_PROCESSED" ? 409 : 500;
    return res.status(status).json({ error: err.message });
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
      message: "Request rejected and balance refunded.",
      payout: result,
    });
  } catch (err) {
    const status = err.message === "ALREADY_PROCESSED" ? 409 : 500;
    return res.status(status).json({ error: err.message });
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
    const status = err.message === "INVALID_ACTION" ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
});

// ══════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════

router.get("/users", async (req, res) => {
  try {
    const search = req.query.search || req.query.q || "";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("profiles")
      .select(
        "id, name, phone, email, account_type, is_seller, is_banned, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (search.trim()) {
      query = query.or(
        `name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`,
      );
    }

    const { data, count, error } = await query.range(
      offset,
      offset + limit - 1,
    );

    if (error) throw error;
    return res.json({
      success: true,
      users: data || [],
      total: count,
      page,
      limit,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Alias route if client.ts calls /admin/users/search
router.get("/users/search", async (req, res) => {
  try {
    const q = req.query.q || req.query.search || "";
    if (!q.trim()) return res.json({ success: true, users: [] });

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, name, phone, email, account_type, is_seller, is_banned, created_at",
      )
      .or(`name.ilike.%${q.trim()}%,phone.ilike.%${q.trim()}%`)
      .limit(20);

    if (error) throw error;
    return res.json({ success: true, users: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/users/:id/ban", async (req, res) => {
  try {
    const { is_banned, reason } = req.body;
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: Boolean(is_banned), ban_reason: reason || null })
      .eq("id", req.params.id);

    if (error) throw error;
    return res.json({
      success: true,
      message: `User ${is_banned ? "banned" : "unbanned"} successfully`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/users/:id/unban", async (req, res) => {
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: false, ban_reason: null })
      .eq("id", req.params.id);

    if (error) throw error;
    return res.json({ success: true, message: "User unbanned successfully" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════
// ORPHAN CLEANUP
// ══════════════════════════════════════

router.get("/orphans/list", async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: orphans, error } = await supabase
      .from("upload_intents")
      .select("id, seller_id, r2_key, created_at")
      .eq("claimed", false)
      .lt("created_at", cutoff);

    if (error) throw error;
    return res.json({ success: true, count: orphans.length, orphans });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/orphans/cleanup", async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: orphans, error } = await supabase
      .from("upload_intents")
      .select("id, r2_key")
      .eq("claimed", false)
      .lt("created_at", cutoff);

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
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: orphan.r2_key,
          }),
        );
        await supabase.from("upload_intents").delete().eq("id", orphan.id);
        deleted++;
      } catch {
        failed++;
      }
    }

    return res.json({
      success: true,
      message: `Cleanup complete. ${deleted} files purged, ${failed} failed.`,
      deleted,
      failed,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
