const LicenceService = require("../../services/LicenceService");
const logger = require("../../utils/logger");

// POST /api/licence/check
const checkLicence = async (req, res) => {
  try {
    const { noteId } = req.body;
    if (!noteId) return res.status(400).json({ error: "noteId is required" });

    const result = await LicenceService.checkLicence(req.user.id, noteId);
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`checkLicence | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Licence check failed" });
  }
};

module.exports = { checkLicence };
