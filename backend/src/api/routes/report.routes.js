const express = require("express");
const router = express.Router();
const { verifyAuthSession } = require("../middlewares/authMiddleware");
const { submitReport } = require("../controllers/report.controller");

router.use(verifyAuthSession);
router.post("/", submitReport);

module.exports = router;
