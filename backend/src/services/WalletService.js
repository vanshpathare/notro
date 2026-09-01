// const supabase = require("../config/supabase.js");

// const MINIMUM_WITHDRAWAL = 50;

// // ─────────────────────────────────────
// // Seller requests a withdrawal
// // ─────────────────────────────────────
// const requestWithdrawal = async (sellerId, amount, upiId) => {
//   if (!amount || parseFloat(amount) < MINIMUM_WITHDRAWAL) {
//     throw new Error("AMOUNT_TOO_LOW");
//   }

//   // If no upiId passed, fall back to their saved one in extra_details
//   let finalUpiId = upiId?.trim();
//   if (!finalUpiId) {
//     const { data: profile } = await supabase
//       .from("profiles")
//       .select("extra_details")
//       .eq("id", sellerId)
//       .single();
//     finalUpiId = profile?.extra_details?.upi_id;
//   }

//   if (!finalUpiId) throw new Error("UPI_ID_REQUIRED");

//   // Check wallet balance
//   const { data: wallet, error: walletError } = await supabase
//     .from("wallets")
//     .select("pending_payout")
//     .eq("user_id", sellerId)
//     .single();

//   if (walletError || !wallet) throw new Error("NO_WALLET_FOUND");

//   if (parseFloat(wallet.pending_payout) < parseFloat(amount)) {
//     throw new Error("INSUFFICIENT_BALANCE");
//   }

//   // Block duplicate pending request
//   const { data: existing } = await supabase
//     .from("payouts")
//     .select("id")
//     .eq("seller_id", sellerId)
//     .eq("status", "pending")
//     .maybeSingle();

//   if (existing) throw new Error("REQUEST_ALREADY_PENDING");

//   // Create payout row
//   const { data: payout, error } = await supabase
//     .from("payouts")
//     .insert({
//       seller_id: sellerId,
//       amount: parseFloat(amount),
//       upi_id: finalUpiId,
//       status: "pending",
//     })
//     .select()
//     .single();

//   if (error) throw error;

//   // Deduct from pending_payout immediately to prevent double-requests
//   await supabase
//     .from("wallets")
//     .update({
//       pending_payout: parseFloat(wallet.pending_payout) - parseFloat(amount),
//       updated_at: new Date().toISOString(),
//     })
//     .eq("user_id", sellerId);

//   return payout;
// };

// // ─────────────────────────────────────
// // Seller's own payout history
// // ─────────────────────────────────────
// const getMyWithdrawals = async (sellerId) => {
//   const { data, error } = await supabase
//     .from("payouts")
//     .select("*")
//     .eq("seller_id", sellerId)
//     .order("created_at", { ascending: false });

//   if (error) throw error;
//   return data || [];
// };

// // ─────────────────────────────────────
// // ADMIN — list all pending payout requests
// // ─────────────────────────────────────
// const getPendingWithdrawals = async () => {
//   const { data, error } = await supabase
//     .from("payouts")
//     .select(
//       `
//       *,
//       profiles ( name, email, phone, account_type )
//     `,
//     )
//     .eq("status", "pending")
//     .order("created_at", { ascending: true });

//   if (error) throw error;

//   // Standardize the nested profiles output for frontend dashboard rendering
//   return (data || []).map((p) => ({
//     id: p.id,
//     seller_id: p.seller_id,
//     amount: parseFloat(p.amount),
//     upi_id: p.upi_id,
//     status: p.status,
//     created_at: p.created_at,
//     seller: p.profiles || {
//       name: "Unknown User",
//       email: "",
//       phone: "",
//       account_type: "student",
//     },
//   }));
// };

// // ─────────────────────────────────────
// // ADMIN — mark as paid (after manual UPI transfer)
// // ─────────────────────────────────────
// const markAsPaid = async (payoutId, utrNumber) => {
//   const { data: payout, error: fetchError } = await supabase
//     .from("payouts")
//     .select("*")
//     .eq("id", payoutId)
//     .single();

//   if (fetchError || !payout) throw new Error("REQUEST_NOT_FOUND");
//   if (payout.status !== "pending") throw new Error("ALREADY_PROCESSED");

//   const { data: updated, error } = await supabase
//     .from("payouts")
//     .update({
//       status: "paid",
//       utr_number: utrNumber || null,
//       paid_at: new Date().toISOString(),
//     })
//     .eq("id", payoutId)
//     .select()
//     .single();

//   if (error) throw error;

//   // Update wallet total_paid_out
//   const { data: wallet } = await supabase
//     .from("wallets")
//     .select("total_paid_out")
//     .eq("user_id", payout.seller_id)
//     .single();

//   await supabase
//     .from("wallets")
//     .update({
//       total_paid_out:
//         parseFloat(wallet?.total_paid_out || 0) + parseFloat(payout.amount),
//       updated_at: new Date().toISOString(),
//     })
//     .eq("user_id", payout.seller_id);

//   return updated;
// };

// // ─────────────────────────────────────
// // ADMIN — reject and refund back to pending_payout
// // ─────────────────────────────────────
// const rejectWithdrawal = async (payoutId, reason) => {
//   const { data: payout, error: fetchError } = await supabase
//     .from("payouts")
//     .select("*")
//     .eq("id", payoutId)
//     .single();

//   if (fetchError || !payout) throw new Error("REQUEST_NOT_FOUND");
//   if (payout.status !== "pending") throw new Error("ALREADY_PROCESSED");

//   const { data: updated, error } = await supabase
//     .from("payouts")
//     .update({
//       status: "rejected",
//       notes: reason || "Not specified",
//       paid_at: new Date().toISOString(),
//     })
//     .eq("id", payoutId)
//     .select()
//     .single();

//   if (error) throw error;

//   // Refund amount back to pending_payout
//   const { data: wallet } = await supabase
//     .from("wallets")
//     .select("pending_payout")
//     .eq("user_id", payout.seller_id)
//     .single();

//   await supabase
//     .from("wallets")
//     .update({
//       pending_payout:
//         parseFloat(wallet?.pending_payout || 0) + parseFloat(payout.amount),
//       updated_at: new Date().toISOString(),
//     })
//     .eq("user_id", payout.seller_id);

//   return updated;
// };

// // ─────────────────────────────────────
// // Wallet integrity check
// // ─────────────────────────────────────
// const verifyWalletIntegrity = async (sellerId) => {
//   const { data: wallet } = await supabase
//     .from("wallets")
//     .select("*")
//     .eq("user_id", sellerId)
//     .single();

//   if (!wallet) return null;

//   const totalEarned = parseFloat(wallet.total_earned || 0);
//   const pendingPayout = parseFloat(wallet.pending_payout || 0);
//   const totalPaidOut = parseFloat(wallet.total_paid_out || 0);
//   const calculated = pendingPayout + totalPaidOut;
//   const isHealthy = Math.abs(calculated - totalEarned) < 0.01;

//   return {
//     total_earned: totalEarned,
//     pending_payout: pendingPayout,
//     total_paid_out: totalPaidOut,
//     calculated_total: Math.round(calculated * 100) / 100,
//     is_consistent: isHealthy,
//     formula: `${pendingPayout} + ${totalPaidOut} = ${calculated} (expected ${totalEarned})`,
//   };
// };

// // ─────────────────────────────────────
// // Fetch standard user history panel
// // ─────────────────────────────────────
// const getPayoutHistory = async (sellerId) => {
//   const { data, error } = await supabase
//     .from("payouts")
//     .select(
//       "id, amount, status, upi_id, utr_number, notes, created_at, paid_at",
//     )
//     .eq("seller_id", sellerId)
//     .order("created_at", { ascending: false });

//   if (error) throw error;
//   return data || [];
// };

// module.exports = {
//   requestWithdrawal,
//   getMyWithdrawals,
//   getPendingWithdrawals,
//   markAsPaid,
//   rejectWithdrawal,
//   verifyWalletIntegrity,
//   getPayoutHistory, // 🌟 FIX: Successfully linked to module exposure layer
// };
