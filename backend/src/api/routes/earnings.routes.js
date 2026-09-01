const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getSummary,
  getMonthlyBreakdown,
  getPayoutHistory,
} = require("../controllers/earnings.controller");

router.use(authMiddleware);
router.get("/summary", getSummary);
router.get("/monthly", getMonthlyBreakdown);
router.get("/payouts", getPayoutHistory);

module.exports = router;
