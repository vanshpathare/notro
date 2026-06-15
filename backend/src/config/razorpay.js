const Razorpay = require("razorpay");

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ CRITICAL ERROR: Razorpay credentials missing in .env");
  process.exit(1); // Hard crash the server to prevent silent runtime failures
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log("⚡ Razorpay client initialized successfully");

module.exports = razorpay;
