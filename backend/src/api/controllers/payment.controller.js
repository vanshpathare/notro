const PaymentService = require("../../services/PaymentService");
const logger = require("../../utils/logger");

// POST /api/payments/create-order
const createOrder = async (req, res) => {
  try {
    const { noteId } = req.body;
    if (!noteId) return res.status(400).json({ error: "noteId is required" });

    const order = await PaymentService.createOrder(req.user.id, noteId);
    return res.json({ success: true, order });
  } catch (err) {
    logger.error(`createOrder | ${req.user?.id} | ${err.message}`);
    const map = {
      NOTE_NOT_FOUND: [404, "Note not found or not approved"],
      CANNOT_BUY_OWN_NOTE: [400, "You cannot purchase your own note"],
      ALREADY_PURCHASED: [409, "You have already purchased this note"],
      SELLER_NOT_FOUND: [404, "Seller account not found"],
      SELLER_BANNED: [403, "This note is currently unavailable"],
    };
    const [status, message] = map[err.message] || [
      500,
      "Failed to create order",
    ];
    return res.status(status).json({ error: message });
  }
};

// POST /api/payments/verify
const verifyPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature) {
      return res
        .status(400)
        .json({ error: "orderId, paymentId and signature are required" });
    }

    const result = await PaymentService.verifyPayment(
      req.user.id,
      orderId,
      paymentId,
      signature,
    );

    return res.json({
      success: true,
      message: result.alreadyProcessed
        ? "Payment already verified"
        : "Payment verified successfully",
      purchase: result.purchase,
    });
  } catch (err) {
    logger.error(`verifyPayment | ${req.user?.id} | ${err.message}`);
    const map = {
      INVALID_SIGNATURE: [
        400,
        "Payment verification failed — invalid signature",
      ],
      ORDER_USER_MISMATCH: [403, "This order does not belong to you"],
      PURCHASE_NOT_FOUND: [404, "Purchase record not found"],
    };
    const [status, message] = map[err.message] || [
      500,
      "Payment verification failed",
    ];
    return res.status(status).json({ error: message });
  }
};

// POST /api/payments/webhook
const webhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) return res.status(400).json({ error: "Missing signature" });

    const result = await PaymentService.handleWebhook(req.body, signature);
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`webhook | ${err.message}`);
    if (err.message === "INVALID_WEBHOOK_SIGNATURE") {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }
    if (err.message === "PURCHASE_NOT_FOUND") {
      // Return 200 to prevent Razorpay from endlessly spamming retries for a missing trace key
      return res
        .status(200)
        .json({
          success: false,
          message: "Purchase record not found, ignoring",
        });
    }
    return res.status(500).json({ error: "Webhook processing failed" });
  }
};

// GET /api/payments/my-purchases
const getMyPurchases = async (req, res) => {
  try {
    const purchases = await PaymentService.getMyPurchases(req.user.id);
    return res.json({ success: true, purchases });
  } catch (err) {
    logger.error(`getMyPurchases | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch purchases" });
  }
};

module.exports = { createOrder, verifyPayment, webhook, getMyPurchases };
