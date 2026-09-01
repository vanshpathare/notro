const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  requestWithdrawal,
  getMyWithdrawals,
} = require("../controllers/withdrawal.controller");

router.use(authMiddleware);
router.post("/", requestWithdrawal);
router.get("/my-history", getMyWithdrawals);

module.exports = router;
