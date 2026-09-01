const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const { submitReport } = require("../controllers/report.controller");

router.use(authMiddleware);
router.post("/", submitReport);

module.exports = router;
