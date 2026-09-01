const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  getUploadUrl,
  verifyUpload,
  getAvatarUploadUrl,
  confirmAvatarUpload,
  getCoverUploadUrl,
  confirmCoverUpload,
  getImageViewUrl,
} = require("../controllers/upload.controller");

router.use(authMiddleware);

// PDF upload
router.post("/pdf-url", getUploadUrl);
router.post("/verify", verifyUpload);

// Avatar
router.post("/avatar-url", getAvatarUploadUrl);
router.post("/avatar-confirm", confirmAvatarUpload);

// Cover image
router.post("/cover-url", getCoverUploadUrl);
router.post("/cover-confirm", confirmCoverUpload);

// Get fresh view URL for any image
router.get("/image-url", getImageViewUrl);

module.exports = router;
