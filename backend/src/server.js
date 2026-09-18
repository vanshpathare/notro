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

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

//app.use(cors());
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS policy violation"));
      }
    },
    credentials: true, // 🟢 Required to send and receive cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // 🟢 Added PATCH for admin routes
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-client-platform",
      "x-device-name",
      "x-admin-token",
    ],
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

const CRAWLER_USER_AGENTS = [
  "facebookexternalhit",
  "WhatsApp",
  "Twitterbot",
  "TelegramBot",
  "LinkedInBot",
  "Slackbot-LinkExpanding",
  "Discordbot",
  "Pinterest",
];

app.get("/notes/:id", async (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";
  const isCrawler = CRAWLER_USER_AGENTS.some((bot) =>
    userAgent.toLowerCase().includes(bot.toLowerCase()),
  );

  // If a real user visits via browser, bypass and let the frontend render
  if (!isCrawler) {
    return next();
  }

  try {
    const supabase = require("./config/supabase.js");
    const R2Service = require("./services/R2Service");

    const { data: note, error } = await supabase
      .from("notes")
      .select(
        `
        id, title, description, price, subject,
        cover_image_key, seller:profiles!seller_id(name)
      `,
      )
      .eq("id", req.params.id)
      .eq("status", "approved")
      .eq("is_deleted", false)
      .single();

    if (error || !note) return next();

    // Resolve cover image for card preview
    let coverUrl = "https://educrit.in/default-preview.png";
    if (note.cover_image_key) {
      if (note.cover_image_key.startsWith("http")) {
        coverUrl = note.cover_image_key;
      } else {
        coverUrl = await R2Service.generateImageViewUrl(note.cover_image_key);
      }
    }

    const title = `${note.title} | EduCrit`;
    const description = note.description
      ? `${note.description.slice(0, 150)}... • ₹${Math.round(note.price)}`
      : `${note.subject} notes by ${note.seller?.name || "Student"} • ₹${Math.round(note.price)} on EduCrit`;
    const clientBase = process.env.CLIENT_URL || "https://educrit.in";
    const pageUrl = `${clientBase}/notes/${note.id}`;

    // Return HTML payload with OG meta tags for scrapers
    return res.send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    
    <!-- Open Graph / WhatsApp / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${coverUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="EduCrit" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${pageUrl}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${coverUrl}" />

    <!-- Instant redirect fallback if opened by a browser -->
    <meta http-equiv="refresh" content="0;url=${pageUrl}" />
  </head>
  <body>
    <p>Redirecting to note...</p>
  </body>
</html>`);
  } catch (err) {
    console.error("OG scraper route error:", err.message);
    return next();
  }
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
