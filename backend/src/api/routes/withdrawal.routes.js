const express = require("express");
const router = express.Router();
const { verifyAuthSession } = require("../middlewares/authMiddleware");
const {
  requestWithdrawal,
  getMyWithdrawals,
} = require("../controllers/withdrawal.controller");

router.use(verifyAuthSession);
router.post("/", requestWithdrawal);
router.get("/my-history", getMyWithdrawals);

module.exports = router;
