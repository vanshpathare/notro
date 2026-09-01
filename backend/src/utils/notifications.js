const { admin, getFirebaseApp } = require("../config/firebase.js");

getFirebaseApp();

const sendToUser = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) return { success: false, reason: "NO_FCM_TOKEN" };

  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          // No click_action — native Android routes to MainActivity automatically
        },
      },
    };

    const response = await admin.messaging().send(message);
    return { success: true, messageId: response };
  } catch (err) {
    if (
      err.code === "messaging/invalid-registration-token" ||
      err.code === "messaging/registration-token-not-registered"
    ) {
      return { success: false, reason: "INVALID_TOKEN", error: err.message };
    }
    console.error("FCM send error:", err.message);
    return { success: false, reason: "SEND_FAILED", error: err.message };
  }
};

const sendToMultipleUsers = async (fcmTokens, title, body, data = {}) => {
  if (!fcmTokens || fcmTokens.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }

  const batchSize = 500;
  let totalSent = 0;
  let totalFailed = 0;
  const invalidTokens = [];

  for (let i = 0; i < fcmTokens.length; i += batchSize) {
    const batch = fcmTokens.slice(i, i + batchSize);

    const message = {
      tokens: batch,
      notification: { title, body },
      data: {
        ...Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ),
      },
      android: {
        priority: "high",
        notification: { sound: "default" },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      totalSent += response.successCount;
      totalFailed += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(batch[idx]);
          }
        }
      });
    } catch (err) {
      console.error("Batch FCM error:", err.message);
      totalFailed += batch.length;
    }
  }

  return { success: true, sent: totalSent, failed: totalFailed, invalidTokens };
};

const notifyFollowers = async (sellerId, sellerName, noteTitle, noteId) => {
  const supabase = require("../config/supabase.js");

  const { data: follows, error } = await supabase
    .from("follows")
    .select(`follower:profiles!follower_id ( id, fcm_token )`)
    .eq("seller_id", sellerId);

  if (error || !follows || follows.length === 0) return;

  const fcmTokens = follows
    .map((f) => f.follower?.fcm_token)
    .filter((token) => token && token.trim().length > 0);

  if (fcmTokens.length === 0) return;

  const result = await sendToMultipleUsers(
    fcmTokens,
    `New notes from ${sellerName}`,
    `"${noteTitle}" is now available`,
    { noteId, type: "new_note", sellerId },
  );

  if (result.invalidTokens && result.invalidTokens.length > 0) {
    await supabase
      .from("profiles")
      .update({ fcm_token: null })
      .in("fcm_token", result.invalidTokens);
  }

  console.log(
    `Follower notifications: ${result.sent} sent, ${result.failed} failed`,
  );
  return result;
};

const notifySellerOfSale = async (sellerId, noteTitle, amount) => {
  const supabase = require("../config/supabase.js");

  const { data: seller } = await supabase
    .from("profiles")
    .select("fcm_token, mute_sale_notifications")
    .eq("id", sellerId)
    .single();

  if (!seller?.fcm_token || seller.mute_sale_notifications) return;

  return await sendToUser(
    seller.fcm_token,
    "🎉 You made a sale!",
    `Someone purchased "${noteTitle}" — ₹${amount} added to your wallet`,
    { type: "sale", noteTitle, amount: String(amount) },
  );
};

const notifyPayoutProcessed = async (sellerId, amount, utrNumber) => {
  const supabase = require("../config/supabase.js");

  const { data: seller } = await supabase
    .from("profiles")
    .select("fcm_token")
    .eq("id", sellerId)
    .single();

  if (!seller?.fcm_token) return;

  return await sendToUser(
    seller.fcm_token,
    "💰 Payout Processed",
    `₹${amount} has been transferred to your UPI account${utrNumber ? `. UTR: ${utrNumber}` : ""}`,
    { type: "payout", amount: String(amount) },
  );
};

const notifySellerNoteUnderReview = async (fcmToken, noteTitle) => {
  console.log(`\n=== 📱 [FCM TRACE] notifySellerNoteUnderReview ===`);
  console.log(`→ Note Title: "${noteTitle}"`);
  console.log(
    `→ Token Recieved: ${fcmToken ? `"${fcmToken}"` : "NULL / EMPTY ⚠️"}`,
  );

  if (!fcmToken) {
    console.log(
      "⏭️ [FCM TRACE] Exiting: No registration token provided for this user.",
    );
    return { success: false, reason: "SKIPPED_NO_TOKEN" };
  }

  console.log(
    "🚀 [FCM TRACE] Token verified. Dispatching to Firebase Admin SDK...",
  );
  const result = await sendToUser(
    fcmToken,
    "📋 Note sent for review",
    `Your note "${noteTitle}" has been updated and is under review. It will be hidden until approved again.`,
    { type: "note_under_review", noteTitle },
  );

  console.log("📊 [FCM TRACE] Delivery Result:", result);
  return result;
};

module.exports = {
  sendToUser,
  sendToMultipleUsers,
  notifyFollowers,
  notifySellerOfSale,
  notifyPayoutProcessed,
  notifySellerNoteUnderReview,
};
