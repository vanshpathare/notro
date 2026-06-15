const R2Service = require("../../services/R2Service");
const { validatePdfContent } = require("../../utils/pdfHelper");
const logger = require("../../utils/logger");

const getUploadUrl = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const { contentType } = req.body; // 🎯 Expecting the client to send the MIME type

    // ── 🔒 STRICT PDF ENFORCEMENT ──
    if (contentType !== "application/pdf") {
      return res.status(400).json({
        error:
          "Invalid file type. Only standard PDF documents (.pdf) are allowed.",
      });
    }

    const { uploadUrl, r2_key } = await R2Service.generateUploadUrl(
      sellerId,
      "pdf",
    );
    return res.json({
      success: true,
      uploadUrl,
      r2_key,
      expiresIn: 900,
      instructions:
        "PUT your PDF file to uploadUrl with Content-Type: application/pdf",
    });
  } catch (err) {
    logger.error(`getUploadUrl | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to generate upload URL" });
  }
};

const getCoverUploadUrl = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { extension = "jpg" } = req.body;

    if (!["jpg", "jpeg", "png", "webp"].includes(extension)) {
      return res
        .status(400)
        .json({ error: "Invalid image extension. Use jpg, png, or webp." });
    }

    const { uploadUrl, r2_key } = await R2Service.generateCoverUploadUrl(
      sellerId,
      extension,
    );
    return res.json({ success: true, uploadUrl, r2_key, expiresIn: 900 });
  } catch (err) {
    logger.error(`getCoverUploadUrl | ${req.user?.id} | ${err.message}`);
    return res
      .status(500)
      .json({ error: "Failed to generate cover upload URL" });
  }
};

const verifyUpload = async (req, res) => {
  try {
    const { r2_key } = req.body;
    if (!r2_key) return res.status(400).json({ error: "r2_key is required" });

    const fileInfo = await R2Service.verifyFileExists(r2_key);
    if (!fileInfo.exists) {
      return res
        .status(404)
        .json({ error: "File not found in storage. Did the upload complete?" });
    }

    const validation = await validatePdfContent(r2_key);
    if (!validation.valid) {
      const reasonMessages = {
        FILE_TOO_SMALL: "File appears to be empty or corrupted",
        FILE_TOO_LARGE: "File exceeds 100MB limit",
        TOO_FEW_PAGES: `PDF has only ${validation.pageCount} pages. Minimum 1 pages required.`,
        INSUFFICIENT_TEXT_CONTENT:
          "PDF appears to be blank or contains no readable text",
      };
      return res.status(400).json({
        error: reasonMessages[validation.reason] || "PDF validation failed",
        reason: validation.reason,
      });
    }

    return res.json({
      success: true,
      message: "File verified successfully",
      page_count: validation.pageCount,
      file_size: validation.fileSize,
      r2_key,
    });
  } catch (err) {
    logger.error(`verifyUpload | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to verify upload" });
  }
};

const getDownloadUrl = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;
    const supabase = require("../../config/supabase.js");

    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, r2_key, seller_id")
      .eq("id", noteId)
      .single();

    if (noteError || !note)
      return res.status(404).json({ error: "Note not found" });

    if (note.seller_id !== userId) {
      const { data: purchase } = await supabase
        .from("purchases")
        .select("id")
        .eq("user_id", userId)
        .eq("note_id", noteId)
        .maybeSingle();

      if (!purchase)
        return res
          .status(403)
          .json({ error: "You must purchase this note to download it" });
    }

    const downloadUrl = await R2Service.generateDownloadUrl(note.r2_key);
    return res.json({ success: true, downloadUrl, expiresIn: 60 });
  } catch (err) {
    logger.error(`getDownloadUrl | ${req.params.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to generate download URL" });
  }
};

const getPreviewUrl = async (req, res) => {
  try {
    const noteId = req.params.id;
    const supabase = require("../../config/supabase.js");

    const { data: note, error } = await supabase
      .from("notes")
      .select("id, r2_key, preview_pages, status")
      .eq("id", noteId)
      .eq("status", "approved")
      .single();

    if (error || !note)
      return res.status(404).json({ error: "Note not found" });
    if (!note.preview_pages || note.preview_pages.length === 0) {
      return res
        .status(404)
        .json({ error: "No preview available for this note" });
    }

    const previewUrl = await R2Service.generateDownloadUrl(note.r2_key);
    return res.json({
      success: true,
      previewUrl,
      preview_pages: note.preview_pages,
      expiresIn: 60,
    });
  } catch (err) {
    logger.error(`getPreviewUrl | ${req.params.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to generate preview URL" });
  }
};

module.exports = {
  getUploadUrl,
  getCoverUploadUrl,
  verifyUpload,
  getDownloadUrl,
  getPreviewUrl,
};
