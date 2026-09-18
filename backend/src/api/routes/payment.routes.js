const express = require("express");
const router = express.Router();
const { verifyAuthSession } = require("../middlewares/authMiddleware");
const {
  createOrder,
  verifyPayment,
  webhook,
  getMyPurchases,
} = require("../controllers/payment.controller");

// Webhook — NO auth, Razorpay calls this directly
router.post("/webhook", webhook);

// Everything below requires login
router.use(verifyAuthSession);
router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);
router.get("/my-purchases", getMyPurchases);

module.exports = router;
