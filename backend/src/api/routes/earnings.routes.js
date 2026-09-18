const express = require("express");
const router = express.Router();
const { verifyAuthSession } = require("../middlewares/authMiddleware");
const {
  getSummary,
  getMonthlyBreakdown,
  getPayoutHistory,
} = require("../controllers/earnings.controller");

router.use(verifyAuthSession);
router.get("/summary", getSummary);
router.get("/monthly", getMonthlyBreakdown);
router.get("/payouts", getPayoutHistory);

module.exports = router;
