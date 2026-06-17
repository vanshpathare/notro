const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware"); // ← match your actual filename
const { checkLicence } = require("../controllers/licence.controller");

router.use(authMiddleware);
router.post("/check", checkLicence);

module.exports = router;
