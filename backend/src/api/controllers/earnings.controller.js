const EarningsService = require("../../services/EarningsService");
const logger = require("../../utils/logger");

// GET /api/earnings/summary
const getSummary = async (req, res) => {
  try {
    const summary = await EarningsService.getSummary(req.user.id);
    return res.json({ success: true, summary });
  } catch (err) {
    logger.error(`getEarningsSummary | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch earnings summary" });
  }
};

// GET /api/earnings/monthly
const getMonthlyBreakdown = async (req, res) => {
  try {
    // Captures ?year=2026 from the URL query parameters
    const { year } = req.query;

    const breakdown = await EarningsService.getMonthlyBreakdown(
      req.user.id,
      year ? parseInt(year) : null,
    );

    return res.json({ success: true, breakdown });
  } catch (err) {
    logger.error(`getMonthlyBreakdown | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch monthly breakdown" });
  }
};

// GET /api/earnings/payouts
const getPayoutHistory = async (req, res) => {
  try {
    const payouts = await EarningsService.getPayoutHistory(req.user.id);
    return res.json({ success: true, payouts });
  } catch (err) {
    logger.error(`getPayoutHistory | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch payout history" });
  }
};

module.exports = { getSummary, getMonthlyBreakdown, getPayoutHistory };
