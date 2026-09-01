const ReportService = require("../../services/ReportService");
const logger = require("../../utils/logger");

const submitReport = async (req, res) => {
  try {
    const { noteId, reason, description } = req.body;
    if (!noteId || !reason) {
      return res.status(400).json({ error: "noteId and reason are required" });
    }
    const report = await ReportService.submitReport(
      req.user.id,
      noteId,
      reason,
      description,
    );
    return res.status(201).json({
      success: true,
      message: "Report submitted. Our team will review it within 48 hours.",
      report,
    });
  } catch (err) {
    logger.error(`submitReport | ${req.user?.id} | ${err.message}`);
    const map = {
      INVALID_REASON: [
        400,
        "Invalid reason. Use: copyright, blank_pdf, inappropriate, spam, misleading",
      ],
      NOTE_NOT_FOUND: [404, "Note not found"],
      ALREADY_REPORTED: [409, "You have already reported this note"],
    };
    const [status, message] = map[err.message] || [
      500,
      "Failed to submit report",
    ];
    return res.status(status).json({ error: message });
  }
};

module.exports = { submitReport };
