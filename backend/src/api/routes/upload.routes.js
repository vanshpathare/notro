const express = require("express");
const router = express.Router();
const verifyAuthSession = require("../middlewares/authMiddleware");
const {
  getUploadUrl,
  getCoverUploadUrl,
  verifyUpload,
} = require("../controllers/upload.controller");

router.use(verifyAuthSession);

router.post("/pdf-url", getUploadUrl);
router.post("/cover-url", getCoverUploadUrl);
router.post("/verify", verifyUpload);

module.exports = router;
