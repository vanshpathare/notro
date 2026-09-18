const express = require("express");
const router = express.Router();
const { verifyAuthSession } = require("../middlewares/authMiddleware"); // ← match your actual filename
const { checkLicence } = require("../controllers/licence.controller");

router.use(verifyAuthSession);
router.post("/check", checkLicence);

module.exports = router;
