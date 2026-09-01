require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan"); // Imported logging tool
const cron = require("node-cron");

const app = express();

app.set("trust proxy", 1);
// Global Middlewares
app.use(helmet());
//app.use(cors());
app.use(
  cors({
    origin: "*", // Allows your React web app, Android app, and iOS app to communicate with the API
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(cookieParser()); // For parsing cookies in requests

app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

app.use(express.json());

app.use(morgan("dev")); // Prints incoming requests to terminal logs

// Health check — test this first in Postman
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date(),
    service: "Notes Vault API Engine",
  });
});

// Dynamic Routes — Updated to match your exact file structure paths
app.use("/api/auth", require("./api/routes/auth.routes"));
app.use("/api/notes", require("./api/routes/note.routes"));
app.use("/api/upload", require("./api/routes/upload.routes"));
app.use("/api/payments", require("./api/routes/payment.routes"));
app.use("/api/licence", require("./api/routes/licence.routes"));
app.use("/api/sellers", require("./api/routes/seller.routes"));
app.use("/api/users", require("./api/routes/user.routes"));
app.use("/api/ratings", require("./api/routes/rating.routes"));
app.use("/api/earnings", require("./api/routes/earnings.routes"));
app.use("/api/admin", require("./api/routes/admin.routes"));
app.use("/api/withdrawals", require("./api/routes/withdrawal.routes"));
app.use("/api/reports", require("./api/routes/report.routes"));
// app.use('/api/wallet', require('./api/routes/earnings'));

const PORT = process.env.PORT || 5000; // Using 5000 to keep 3000 open for React testing if needed
app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`,
  );
});

// ─────────────────────────────────────────────────────────────────
// AUTOMATED CRON TASKS
// ─────────────────────────────────────────────────────────────────

// Run orphan file cleanup every day at 3 AM
cron.schedule("0 3 * * *", async () => {
  console.log("⏰ Running automated orphan file cleanup...");
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);

    const supabase = require("./config/supabase.js");
    const r2Client = require("./config/r2.js");
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

    // Fetch unclaimed intents older than 24 hours
    const { data: orphans, error } = await supabase
      .from("upload_intents")
      .select("id, r2_key")
      .eq("claimed", false)
      .lt("created_at", cutoff.toISOString());

    if (error) throw error;

    if (!orphans || orphans.length === 0) {
      console.log("ℹ️ Orphan cleanup: No files to delete today.");
      return;
    }

    // Process all deletions in parallel concurrently (non-blocking for the event loop)
    await Promise.allSettled(
      orphans.map(async (orphan) => {
        try {
          // Delete from Cloudflare R2
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: orphan.r2_key,
            }),
          );
          // Delete trace ledger from Supabase database
          await supabase.from("upload_intents").delete().eq("id", orphan.id);
        } catch (individualErr) {
          console.error(
            `Failed to purge orphan asset [${orphan.r2_key}]:`,
            individualErr.message,
          );
        }
      }),
    );

    console.log(
      `✅ Orphan cleanup complete. ${orphans.length} assets evaluated.`,
    );
  } catch (err) {
    console.error("❌ Orphan cleanup critical failure:", err.message);
  }
});

module.exports = app;
