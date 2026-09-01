const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const {
  submitRating,
  getRatingsForNote,
} = require("../controllers/rating.controller");

// Public — anyone can view ratings
router.get("/:noteId", getRatingsForNote);

// Protected — must be logged in to submit
router.use(authMiddleware);
router.post("/", submitRating);

module.exports = router;
