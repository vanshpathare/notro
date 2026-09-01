const WithdrawalService = require("../../services/WithdrawalService");
const logger = require("../../utils/logger");

const requestWithdrawal = async (req, res) => {
  try {
    const { amount, upiId } = req.body;
    const result = await WithdrawalService.requestWithdrawal(
      req.user.id,
      amount,
      upiId,
    );
    return res.status(201).json({
      success: true,
      message:
        "Withdrawal request submitted. Usually processed within 2-3 business days.",
      payout: result,
    });
  } catch (err) {
    logger.error(`requestWithdrawal | ${req.user?.id} | ${err.message}`);
    const map = {
      AMOUNT_TOO_LOW: [400, "Minimum withdrawal amount is ₹50"],
      UPI_ID_REQUIRED: [
        400,
        "No UPI ID found. Please update your profile first.",
      ],
      NO_WALLET_FOUND: [404, "No earnings wallet found"],
      INSUFFICIENT_BALANCE: [
        400,
        "Insufficient balance for this withdrawal amount",
      ],
      REQUEST_ALREADY_PENDING: [
        409,
        "You already have a pending withdrawal request",
      ],
    };
    const [status, message] = map[err.message] || [
      500,
      "Failed to submit withdrawal request",
    ];
    return res.status(status).json({ error: message });
  }
};

const getMyWithdrawals = async (req, res) => {
  try {
    const payouts = await WithdrawalService.getMyWithdrawals(req.user.id);
    return res.json({ success: true, payouts });
  } catch (err) {
    logger.error(`getMyWithdrawals | ${req.user?.id} | ${err.message}`);
    return res
      .status(500)
      .json({ error: "Failed to fetch withdrawal history" });
  }
};

module.exports = { requestWithdrawal, getMyWithdrawals };
