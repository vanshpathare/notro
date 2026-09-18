const express = require("express");
const router = express.Router();
const { verifyAuthSession } = require("../middlewares/authMiddleware");
const {
  submitRating,
  getRatingsForNote,
} = require("../controllers/rating.controller");

// Public — anyone can view ratings
router.get("/:noteId", getRatingsForNote);

// Protected — must be logged in to submit
router.use(verifyAuthSession);
router.post("/", submitRating);

module.exports = router;
