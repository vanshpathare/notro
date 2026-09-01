const supabase = require("../config/supabase.js");

// ─────────────────────────────────────
// Earnings summary — total earned, pending payout, paid out
// ─────────────────────────────────────
const getSummary = async (sellerId) => {
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", sellerId)
    .maybeSingle();

  if (!wallet) {
    return {
      total_earned: 0,
      pending_payout: 0,
      total_paid_out: 0,
    };
  }

  return {
    total_earned: Math.round(parseFloat(wallet.total_earned || 0) * 100) / 100,
    pending_payout:
      Math.round(parseFloat(wallet.pending_payout || 0) * 100) / 100,
    total_paid_out:
      Math.round(parseFloat(wallet.total_paid_out || 0) * 100) / 100,
  };
};

// ─────────────────────────────────────
// Monthly earnings breakdown — Upgraded for Year-by-Year Filtering
// ─────────────────────────────────────
const getMonthlyBreakdown = async (sellerId, targetYear = null) => {
  // If no year is specified by the frontend, default to the current year dynamically
  const yearToFetch = targetYear || new Date().getFullYear();

  // Timezone-safe hard boundaries to prevent skipping New Year's Eve transactions
  const startOfYear = `${yearToFetch}-01-01T00:00:00.000Z`;
  const endOfYear = `${yearToFetch}-12-31T23:59:59.999Z`;

  const { data: purchases, error } = await supabase
    .from("purchases")
    .select("seller_earning, paid_at")
    .eq("seller_id", sellerId)
    .eq("status", "paid")
    .gte("paid_at", startOfYear)
    .lte("paid_at", endOfYear)
    .order("paid_at", { ascending: true });

  if (error) throw error;

  const monthlyMap = {};

  for (const p of purchases || []) {
    const date = new Date(p.paid_at);
    // Format key as '01', '02', etc. matching month index
    const key = String(date.getMonth() + 1).padStart(2, "0");

    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        month: `${yearToFetch}-${key}`,
        total: 0,
        sales_count: 0,
      };
    }
    monthlyMap[key].total += parseFloat(p.seller_earning || 0);
    monthlyMap[key].sales_count += 1;
  }

  // Generate all 12 months for that specific year so the chart renders completely
  const result = [];
  for (let m = 1; m <= 12; m++) {
    const key = String(m).padStart(2, "0");
    const monthLabel = `${yearToFetch}-${key}`;

    const monthData = monthlyMap[key] || {
      month: monthLabel,
      total: 0,
      sales_count: 0,
    };
    // Round to 2 decimal places to remove floating-point math issues (e.g. 79.200000004)
    monthData.total = Math.round(monthData.total * 100) / 100;

    result.push(monthData);
  }

  return result;
};

// ─────────────────────────────────────
// Payout history — placeholder for now since manual payouts
// ─────────────────────────────────────
const getPayoutHistory = async (sellerId) => {
  const { data, error } = await supabase
    .from("payouts")
    .select(
      "id, amount, status, upi_id, utr_number, notes, created_at, paid_at",
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
};

module.exports = { getSummary, getMonthlyBreakdown, getPayoutHistory };
