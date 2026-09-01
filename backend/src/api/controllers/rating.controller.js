const RatingService = require("../../services/RatingService");
const logger = require("../../utils/logger");

// POST /api/ratings
const submitRating = async (req, res) => {
  try {
    const { noteId, stars, reviewText } = req.body;
    if (!noteId) return res.status(400).json({ error: "noteId is required" });

    const rating = await RatingService.submitRating(
      req.user.id,
      noteId,
      stars,
      reviewText,
    );
    return res.status(201).json({ success: true, rating });
  } catch (err) {
    logger.error(`submitRating | ${req.user?.id} | ${err.message}`);
    const map = {
      INVALID_STARS: [400, "Rating must be between 1 and 5 stars"],
      PURCHASE_REQUIRED: [403, "You must purchase this note before rating it"],
      ALREADY_RATED: [409, "You have already rated this note"],
    };
    const [status, message] = map[err.message] || [
      500,
      "Failed to submit rating",
    ];
    return res.status(status).json({ error: message });
  }
};

// GET /api/ratings/:noteId
const getRatingsForNote = async (req, res) => {
  try {
    const result = await RatingService.getRatingsForNote(req.params.noteId);
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`getRatingsForNote | ${req.params.noteId} | ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch ratings" });
  }
};

module.exports = { submitRating, getRatingsForNote };
