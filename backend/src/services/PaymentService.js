const crypto = require("crypto");
const razorpay = require("../config/razorpay.js");
const supabase = require("../config/supabase.js");

const getCommissionRate = (accountType) =>
  accountType === "student" ? 20.0 : 12.0;

// ──────────────────────────────────────────────────────────────────────
// STEP 1 — Create a Razorpay order
// ──────────────────────────────────────────────────────────────────────
const createOrder = async (buyerId, noteId) => {
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("id, price, seller_id, status, title")
    .eq("id", noteId)
    .eq("status", "approved")
    .single();

  if (noteError || !note) throw new Error("NOTE_NOT_FOUND");
  if (note.seller_id === buyerId) throw new Error("CANNOT_BUY_OWN_NOTE");

  const { data: existing } = await supabase
    .from("purchases")
    .select("id, status")
    .eq("buyer_id", buyerId)
    .eq("note_id", noteId)
    .maybeSingle();

  if (existing?.status === "paid") throw new Error("ALREADY_PURCHASED");

  const { data: seller, error: sellerError } = await supabase
    .from("profiles")
    .select("account_type, is_banned")
    .eq("id", note.seller_id)
    .single();

  if (sellerError || !seller) throw new Error("SELLER_NOT_FOUND");
  if (seller.is_banned) throw new Error("SELLER_BANNED");

  const commissionRate = getCommissionRate(seller.account_type);
  const amount = parseFloat(note.price);
  const platformFee = Math.round(amount * commissionRate) / 100;
  const sellerEarning = Math.round((amount - platformFee) * 100) / 100;

  // Razorpay expects price values entirely in smallest currency unit (Paise)
  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: `note_${noteId.slice(0, 8)}_${Date.now()}`,
    notes: { buyer_id: buyerId, note_id: noteId },
  });

  let purchaseRow;
  if (existing) {
    const { data, error } = await supabase
      .from("purchases")
      .update({
        seller_id: note.seller_id,
        amount_paid: amount,
        platform_fee: platformFee,
        seller_earning: sellerEarning,
        razorpay_order_id: order.id,
        razorpay_payment_id: null,
        status: "created",
        paid_at: null,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    purchaseRow = data;
  } else {
    const { data, error } = await supabase
      .from("purchases")
      .insert({
        buyer_id: buyerId,
        note_id: noteId,
        seller_id: note.seller_id,
        amount_paid: amount,
        platform_fee: platformFee,
        seller_earning: sellerEarning,
        razorpay_order_id: order.id,
        status: "created",
      })
      .select()
      .single();
    if (error) throw error;
    purchaseRow = data;
  }

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    noteTitle: note.title,
    purchaseId: purchaseRow.id,
  };
};

// ──────────────────────────────────────────────────────────────────────
// Seller earnings wallet — balance state update handler
// ──────────────────────────────────────────────────────────────────────
const creditSellerWallet = async (sellerId, amount) => {
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", sellerId)
    .maybeSingle();

  if (wallet) {
    await supabase
      .from("wallets")
      .update({
        total_earned: parseFloat(wallet.total_earned) + amount,
        pending_payout: parseFloat(wallet.pending_payout) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", sellerId);
  } else {
    await supabase.from("wallets").insert({
      user_id: sellerId,
      total_earned: amount,
      pending_payout: amount,
      total_paid_out: 0,
    });
  }
};

// ──────────────────────────────────────────────────────────────────────
// Shared finalization — idempotent processing block
// ──────────────────────────────────────────────────────────────────────
const finalizePurchase = async (orderId, paymentId) => {
  const { data: purchase, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("razorpay_order_id", orderId)
    .single();

  if (error || !purchase) throw new Error("PURCHASE_NOT_FOUND");

  // If webhook or signature verification already flipped status, stop execution cleanly
  if (purchase.status === "paid") {
    return { alreadyProcessed: true, purchase };
  }

  const { data: updated, error: updateError } = await supabase
    .from("purchases")
    .update({
      razorpay_payment_id: paymentId,
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", purchase.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Track sales count directly inside notes table metrics
  const { data: note } = await supabase
    .from("notes")
    .select("purchase_count")
    .eq("id", purchase.note_id)
    .single();

  await supabase
    .from("notes")
    .update({ purchase_count: (note?.purchase_count || 0) + 1 })
    .eq("id", purchase.note_id);

  // Trigger balance update for the corresponding note owner
  await creditSellerWallet(
    purchase.seller_id,
    parseFloat(purchase.seller_earning),
  );

  return { alreadyProcessed: false, purchase: updated };
};

// ──────────────────────────────────────────────────────────────────────
// STEP 2 — Verify client-side checkout signature
// ──────────────────────────────────────────────────────────────────────
const verifyPayment = async (buyerId, orderId, paymentId, signature) => {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature !== signature) throw new Error("INVALID_SIGNATURE");

  const { data: purchase } = await supabase
    .from("purchases")
    .select("buyer_id")
    .eq("razorpay_order_id", orderId)
    .single();

  if (!purchase || purchase.buyer_id !== buyerId) {
    throw new Error("ORDER_USER_MISMATCH");
  }

  return await finalizePurchase(orderId, paymentId);
};

// ──────────────────────────────────────────────────────────────────────
// STEP 3 — Automated Webhook verification listener
// ──────────────────────────────────────────────────────────────────────
const handleWebhook = async (rawBody, signature) => {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  if (expectedSignature !== signature)
    throw new Error("INVALID_WEBHOOK_SIGNATURE");

  const payload = JSON.parse(rawBody.toString());

  if (payload.event === "payment.captured") {
    const payment = payload.payload.payment.entity;
    await finalizePurchase(payment.order_id, payment.id);
    return { event: "payment.captured", processed: true };
  }

  if (payload.event === "payment.failed") {
    const payment = payload.payload.payment.entity;
    await supabase
      .from("purchases")
      .update({ status: "failed" })
      .eq("razorpay_order_id", payment.order_id)
      .neq("status", "paid"); // Safeguard block so we never overwrite an already settled success status
    return { event: "payment.failed", processed: true };
  }

  return { event: payload.event, processed: false };
};

// ──────────────────────────────────────────────────────────────────────
// Buyer Library Fetch Engine
// ──────────────────────────────────────────────────────────────────────
const getMyPurchases = async (buyerId) => {
  const { data, error } = await supabase
    .from("purchases")
    .select(
      `
      id,
      amount_paid,
      status,
      paid_at,
      note:notes (
        id, title, subject, course, cover_image_key, page_count
      )
    `,
    )
    .eq("buyer_id", buyerId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getMyPurchases,
  getCommissionRate,
};
