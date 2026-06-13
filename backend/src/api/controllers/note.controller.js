const NoteService = require("../../services/NoteService");
const logger = require("../../utils/logger");

const createNote = async (req, res) => {
  try {
    const note = await NoteService.createNote(req.user.id, req.body);
    return res.status(201).json({
      success: true,
      message: "Note submitted for review. It will go live once approved.",
      note,
    });
  } catch (err) {
    logger.error(`createNote | ${req.user?.id} | ${err.message}`);
    const map = {
      TITLE_REQUIRED: [400, "Title is required"],
      SUBJECT_REQUIRED: [400, "Subject is required"],
      R2_KEY_REQUIRED: [400, "PDF file must be uploaded first"],
      PRICE_REQUIRED: [400, "Price is required"],
      PRICE_OUT_OF_RANGE: [400, "Price must be between ₹10 and ₹999"],
      PAGE_COUNT_REQUIRED: [400, "Page count is required"],
      DECLARATION_REQUIRED: [
        400,
        "You must confirm you own the rights to this content",
      ],
      TOO_MANY_PREVIEW_PAGES: [400, "Maximum 4 preview pages allowed"],
      SELLER_NOT_FOUND: [404, "Seller account not found"],
      ACCOUNT_BANNED: [403, "Your account has been suspended"],
      ACCOUNT_PENDING_VERIFICATION: [
        403,
        "Your account is pending verification",
      ],
    };
    const [status, message] = map[err.message] || [
      500,
      "Failed to create note listing",
    ];
    return res.status(status).json({ error: message });
  }
};

const getNotes = async (req, res) => {
  try {
    const result = await NoteService.getNotes(req.query);
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`getNotes | ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch notes" });
  }
};

const getNoteById = async (req, res) => {
  try {
    const viewerId = req.user?.id || null;
    const note = await NoteService.getNoteById(req.params.id, viewerId);
    return res.json({ success: true, note });
  } catch (err) {
    logger.error(`getNoteById | ${req.params.id} | ${err.message}`);
    if (err.message === "NOTE_NOT_FOUND") {
      return res
        .status(404)
        .json({ error: "Note not found or not yet approved" });
    }
    return res.status(500).json({ error: "Failed to fetch note" });
  }
};

const updateNote = async (req, res) => {
  try {
    const note = await NoteService.updateNote(
      req.params.id,
      req.user.id,
      req.body,
    );
    return res.json({
      success: true,
      message:
        note.status === "pending"
          ? "Note updated and sent back for review"
          : "Note updated successfully",
      note,
    });
  } catch (err) {
    logger.error(`updateNote | ${req.params.id} | ${err.message}`);
    const map = {
      NOTE_NOT_FOUND: [404, "Note not found"],
      NOT_YOUR_NOTE: [403, "You can only edit your own notes"],
      NO_VALID_FIELDS: [400, "No valid fields to update"],
      PRICE_OUT_OF_RANGE: [400, "Price must be between ₹10 and ₹999"],
      TOO_MANY_PREVIEW_PAGES: [400, "Maximum 4 preview pages allowed"],
    };
    const [status, message] = map[err.message] || [
      500,
      "Failed to update note",
    ];
    return res.status(status).json({ error: message });
  }
};

const getMyListings = async (req, res) => {
  try {
    const notes = await NoteService.getMyListings(req.user.id);
    return res.json({ success: true, notes });
  } catch (err) {
    logger.error(`getMyListings | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to fetch your listings" });
  }
};

const getNoteAnalytics = async (req, res) => {
  try {
    const result = await NoteService.getNoteAnalytics(
      req.params.id,
      req.user.id,
    );
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`getNoteAnalytics | ${req.params.id} | ${err.message}`);
    if (err.message === "NOTE_NOT_FOUND") {
      return res
        .status(404)
        .json({ error: "Note not found or not your listing" });
    }
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  getMyListings,
  getNoteAnalytics,
};
