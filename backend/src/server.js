require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan"); // Imported logging tool

const app = express();

app.set("trust proxy", 1);
// Global Middlewares
app.use(helmet());
app.use(cors());

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
// app.use('/api/wallet', require('./api/routes/earnings'));

const PORT = process.env.PORT || 5000; // Using 5000 to keep 3000 open for React testing if needed
app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`,
  );
});

module.exports = app;
