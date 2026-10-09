const PaymentService = require("../../services/PaymentService");
const logger = require("../../utils/logger");

// POST /api/payments/create-order
const createOrder = async (req, res) => {
  try {
    const { noteId, promoCode } = req.body;
    if (!noteId) return res.status(400).json({ error: "noteId is required" });

    const order = await PaymentService.createOrder(
      req.user.id,
      noteId,
      promoCode,
    );
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
      return res.status(200).json({
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

// POST /api/payments/validate-promo
const validatePromo = async (req, res) => {
  try {
    const { code, noteId } = req.body;
    if (!code || !noteId) {
      return res.status(400).json({ error: "Code and noteId are required" });
    }

    const { data: note } = await supabase
      .from("notes")
      .select("price")
      .eq("id", noteId)
      .eq("status", "approved")
      .single();

    if (!note) return res.status(404).json({ error: "Note not found" });

    const cleanCode = String(code).trim().toUpperCase();
    const { data: promo } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", cleanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (!promo) {
      return res.status(404).json({ error: "Invalid promo code" });
    }

    const now = new Date();
    if (now < new Date(promo.valid_from) || now > new Date(promo.valid_until)) {
      return res.status(400).json({ error: "This promo code has expired" });
    }

    const originalPrice = parseFloat(note.price);
    const discountPercentage = Math.min(
      parseFloat(promo.discount_percentage),
      10.0,
    );
    const discountAmount =
      Math.round(((originalPrice * discountPercentage) / 100) * 100) / 100;
    const finalPrice = Math.round((originalPrice - discountAmount) * 100) / 100;

    return res.json({
      success: true,
      code: promo.code,
      discountPercentage,
      discountAmount,
      finalPrice,
    });
  } catch (err) {
    logger.error(`validatePromo | ${err.message}`);
    return res.status(500).json({ error: "Failed to validate promo code" });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  webhook,
  getMyPurchases,
  validatePromo,
};
