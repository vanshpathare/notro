const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware"); // ← match your actual filename
const {
  getMyProfile,
  updateMyProfile,
  becomeSeller,
} = require("../controllers/user.controller");

router.use(authMiddleware);
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.post("/become-seller", becomeSeller);

module.exports = router;
