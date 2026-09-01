const R2Service = require("../../services/R2Service");
const { validatePdfContent, extractPages } = require("../../utils/pdfHelper");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const r2Client = require("../../config/r2.js");
const logger = require("../../utils/logger");
const supabase = require("../../config/supabase.js");
const { compressAvatar, compressCover } = require("../../utils/imageHelper");

// ─────────────────────────────────────
// POST /api/upload/pdf-url
// Step 1 — seller requests presigned URL to upload PDF
// ─────────────────────────────────────
const getUploadUrl = async (req, res) => {
  try {
    const { uploadUrl, r2_key } = await R2Service.generateUploadUrl(
      req.user.id,
      "pdf",
    );
    return res.json({
      success: true,
      uploadUrl,
      r2_key,
      expiresIn: 900,
      instructions:
        "PUT your PDF to uploadUrl with Content-Type: application/pdf",
    });
  } catch (err) {
    logger.error(`getUploadUrl | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to generate upload URL" });
  }
};

// ─────────────────────────────────────
// POST /api/upload/verify
// Step 2 — verify PDF uploaded successfully and validate content
// ─────────────────────────────────────
const verifyUpload = async (req, res) => {
  try {
    const { r2_key, preview_pages } = req.body;
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
        TOO_FEW_PAGES: `PDF has only ${validation.pageCount} pages. Minimum 5 pages required.`,
        INSUFFICIENT_TEXT_CONTENT:
          "PDF appears to be blank or contains no readable text",
      };
      console.log(`PDF validation failed for ${r2_key}: ${validation.reason}`);
      return res.status(400).json({
        error: reasonMessages[validation.reason] || "PDF validation failed",
        reason: validation.reason,
      });
    }

    // Mark upload intent as claimed
    await supabase
      .from("upload_intents")
      .update({ claimed: true })
      .eq("r2_key", r2_key);

    // Generate preview PDF if preview_pages provided
    let previewR2Key = null;
    if (
      preview_pages &&
      preview_pages.length > 0 &&
      preview_pages.length <= 4
    ) {
      try {
        // Download the full PDF from R2
        const command = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: r2_key,
        });
        const response = await r2Client.send(command);

        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        const fullBuffer = Buffer.concat(chunks);

        // Extract only the selected preview pages
        const previewBuffer = await extractPages(fullBuffer, preview_pages);

        // Generate a temporary noteId-like key using r2_key hash
        const tempId = r2_key.split("/").pop().replace(".pdf", "");
        previewR2Key = await R2Service.uploadPreviewPdf(
          `temp_${tempId}`,
          previewBuffer,
        );
      } catch (previewErr) {
        // Preview generation failure should not block the main upload
        console.error("Preview generation failed:", previewErr.message);
      }
    }

    return res.json({
      success: true,
      message: "File verified successfully",
      page_count: validation.pageCount,
      file_size: validation.fileSize,
      r2_key,
      preview_r2_key: previewR2Key,
    });
  } catch (err) {
    logger.error(`verifyUpload | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to verify upload" });
  }
};

// ─────────────────────────────────────
// POST /api/upload/avatar-url
// User requests presigned URL to upload their profile picture
// ─────────────────────────────────────
const getAvatarUploadUrl = async (req, res) => {
  try {
    const { extension = "jpg" } = req.body;

    const { uploadUrl, r2_key } = await R2Service.generateAvatarUploadUrl(
      req.user.id,
      extension,
    );

    return res.json({
      success: true,
      uploadUrl,
      r2_key,
      expiresIn: 900,
      instructions: `PUT your image to uploadUrl with Content-Type: image/${extension}`,
    });
  } catch (err) {
    logger.error(`getAvatarUploadUrl | ${req.user?.id} | ${err.message}`);
    if (err.message === "INVALID_IMAGE_FORMAT") {
      return res
        .status(400)
        .json({ error: "Invalid format. Use jpg, png, or webp." });
    }
    return res
      .status(500)
      .json({ error: "Failed to generate avatar upload URL" });
  }
};

// ─────────────────────────────────────
// POST /api/upload/avatar-confirm
// After uploading avatar to R2, save the r2_key to profile
// ─────────────────────────────────────
const confirmAvatarUpload = async (req, res) => {
  try {
    const { r2_key } = req.body;
    if (!r2_key) return res.status(400).json({ error: "r2_key is required" });

    // Verify file actually exists in R2
    const fileInfo = await R2Service.verifyFileExists(r2_key);
    if (!fileInfo.exists) {
      return res
        .status(404)
        .json({ error: "Image not found in storage. Upload may have failed." });
    }

    // Validate it's a reasonable image size
    // 5MB limit for avatars
    if (fileInfo.size > 5 * 1024 * 1024) {
      // Delete oversized file
      await R2Service.deleteFile(r2_key);
      return res.status(400).json({ error: "Image exceeds 5MB limit" });
    }

    // Download uploaded image from private bucket
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const r2Client = require("../../config/r2.js");

    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2_key,
    });
    const s3Response = await r2Client.send(getCommand);
    const chunks = [];
    for await (const chunk of s3Response.Body) {
      chunks.push(chunk);
    }
    const originalBuffer = Buffer.concat(chunks);

    // Compress the image
    let compressedBuffer;
    try {
      compressedBuffer = await compressAvatar(originalBuffer);
    } catch (compressErr) {
      // If compression fails, use original
      console.error(
        "Avatar compression failed, using original:",
        compressErr.message,
      );
      compressedBuffer = originalBuffer;
    }

    // Upload compressed image to PUBLIC bucket with permanent URL
    // Deterministic key — always overwrites previous avatar automatically
    const publicKey = `avatars/${req.user.id}/profile.jpg`;
    const basePublicUrl = await R2Service.uploadToPublicBucket(
      publicKey,
      compressedBuffer,
      "image/jpeg",
    );

    // Delete the original from private bucket — no longer needed
    await R2Service.deleteFile(r2_key).catch(() => {});

    const version = Date.now();
    const publicUrl = `${basePublicUrl}?v=${version}`;

    // Get old avatar to delete it from R2 (avoid storage waste)
    const { data: profile } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", req.user.id)
      .single();

    // If old avatar was a private r2_key (not a public URL), delete it
    if (
      profile?.avatar_url &&
      !profile.avatar_url.startsWith("http") &&
      profile.avatar_url !== r2_key
    ) {
      R2Service.deleteFile(profile.avatar_url).catch(() => {});
    }

    // Save new avatar_url to profile
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", req.user.id)
      .select()
      .single();

    if (error) throw error;

    // Delete old avatar from R2 after successful update
    if (profile?.avatar_url && profile.avatar_url !== r2_key) {
      R2Service.deleteFile(profile.avatar_url).catch(() => {});
    }

    // Generate a view URL so the app can display immediately
    //const viewUrl = await R2Service.generateImageViewUrl(r2_key);

    return res.json({
      success: true,
      message: "Avatar updated successfully",
      avatar_url: publicUrl,
      view_url: publicUrl, // public URL can be used directly
      user: updated,
    });
  } catch (err) {
    logger.error(`confirmAvatarUpload | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to save avatar" });
  }
};

// ─────────────────────────────────────
// POST /api/upload/cover-url
// Seller requests presigned URL to upload note cover image
// ─────────────────────────────────────
const getCoverUploadUrl = async (req, res) => {
  try {
    const { extension = "jpg" } = req.body;

    const { uploadUrl, r2_key } = await R2Service.generateCoverUploadUrl(
      req.user.id,
      extension,
    );

    return res.json({
      success: true,
      uploadUrl,
      r2_key,
      expiresIn: 900,
    });
  } catch (err) {
    logger.error(`getCoverUploadUrl | ${req.user?.id} | ${err.message}`);
    if (err.message === "INVALID_IMAGE_FORMAT") {
      return res
        .status(400)
        .json({ error: "Invalid format. Use jpg, png, or webp." });
    }
    return res
      .status(500)
      .json({ error: "Failed to generate cover upload URL" });
  }
};

// ─────────────────────────────────────
// POST /api/upload/cover-confirm
// After uploading cover to R2, save r2_key to the note
// ─────────────────────────────────────
const confirmCoverUpload = async (req, res) => {
  try {
    const { r2_key, noteId } = req.body;
    if (!r2_key) return res.status(400).json({ error: "r2_key is required" });
    if (!noteId) return res.status(400).json({ error: "noteId is required" });

    // Verify the note belongs to this seller
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .select("id, seller_id, cover_image_key")
      .eq("id", noteId)
      .single();

    if (noteError || !note)
      return res.status(404).json({ error: "Note not found" });
    if (note.seller_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only update your own notes" });
    }

    // Verify file exists in R2
    const fileInfo = await R2Service.verifyFileExists(r2_key);
    if (!fileInfo.exists) {
      return res
        .status(404)
        .json({ error: "Image not found in storage. Upload may have failed." });
    }

    // 5MB limit for cover images
    if (fileInfo.size > 5 * 1024 * 1024) {
      await R2Service.deleteFile(r2_key);
      return res.status(400).json({ error: "Image exceeds 5MB limit" });
    }

    // Download uploaded image from private bucket
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const r2Client = require("../../config/r2.js");

    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2_key,
    });
    const s3Response = await r2Client.send(getCommand);
    const chunks = [];
    for await (const chunk of s3Response.Body) {
      chunks.push(chunk);
    }
    const originalBuffer = Buffer.concat(chunks);

    // Compress the cover image
    let compressedBuffer;
    try {
      compressedBuffer = await compressCover(originalBuffer);
    } catch (compressErr) {
      console.error(
        "Cover compression failed, using original:",
        compressErr.message,
      );
      compressedBuffer = originalBuffer;
    }

    // Upload compressed image to PUBLIC bucket
    // Deterministic key per note — always overwrites previous cover
    const publicKey = `covers/${noteId}/cover.jpg`;
    const basePublicUrl = await R2Service.uploadToPublicBucket(
      publicKey,
      compressedBuffer,
      "image/jpeg",
    );

    // Add timestamp to bust CDN cache on every update
    const version = Date.now();
    const publicUrl = `${basePublicUrl}?v=${version}`;

    // Delete the temp upload from private bucket
    await R2Service.deleteFile(r2_key).catch(() => {});

    // Delete old cover from public bucket if it exists
    // Old covers used deterministic key so deleting by key is safe
    if (
      note.cover_image_key &&
      note.cover_image_key.startsWith(process.env.R2_PUBLIC_URL)
    ) {
      const oldKey = note.cover_image_key.replace(
        process.env.R2_PUBLIC_URL + "/",
        "",
      );
      R2Service.deleteFromPublicBucket(oldKey).catch(() => {});
    } else if (
      note.cover_image_key &&
      !note.cover_image_key.startsWith("http")
    ) {
      // Old format was private r2_key — delete from private bucket
      R2Service.deleteFile(note.cover_image_key).catch(() => {});
    }

    // Save cover_image_key to note
    const { error: updateError } = await supabase
      .from("notes")
      .update({ cover_image_key: publicUrl })
      .eq("id", noteId);

    if (updateError) throw updateError;

    //const viewUrl = await R2Service.generateImageViewUrl(r2_key);

    return res.json({
      success: true,
      message: "Cover image updated successfully",
      cover_image_key: publicUrl,
      view_url: publicUrl, // public URL can be used directly
    });
  } catch (err) {
    console.error("CONFIRM COVER ERROR:", err.message);
    logger.error(`confirmCoverUpload | ${req.user?.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to save cover image" });
  }
};

// ─────────────────────────────────────
// GET /api/upload/image-url
// Get a fresh presigned view URL for any image key
// Used by Android app to display avatars and covers
// ─────────────────────────────────────
const getImageViewUrl = async (req, res) => {
  try {
    const { r2_key } = req.query;
    if (!r2_key) return res.status(400).json({ error: "r2_key is required" });

    const url = await R2Service.generateImageViewUrl(r2_key);
    if (!url) return res.status(404).json({ error: "Image not found" });

    return res.json({ success: true, url, expiresIn: 3600 });
  } catch (err) {
    logger.error(`getImageViewUrl | ${err.message}`);
    return res.status(500).json({ error: "Failed to generate image URL" });
  }
};

// ─────────────────────────────────────
// GET /api/notes/:id/download-url
// Buyer downloads purchased PDF
// ─────────────────────────────────────
const getDownloadUrl = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;

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
        .eq("buyer_id", userId)
        .eq("note_id", noteId)
        .maybeSingle();

      if (!purchase) {
        return res
          .status(403)
          .json({ error: "You must purchase this note to download it" });
      }
    }

    const downloadUrl = await R2Service.generateDownloadUrl(note.r2_key);
    return res.json({ success: true, downloadUrl, expiresIn: 60 });
  } catch (err) {
    logger.error(`getDownloadUrl | ${req.params.id} | ${err.message}`);
    return res.status(500).json({ error: "Failed to generate download URL" });
  }
};

// ─────────────────────────────────────
// GET /api/notes/:id/preview-url
// Free preview — no purchase required
// ─────────────────────────────────────
const getPreviewUrl = async (req, res) => {
  try {
    const { data: note, error } = await supabase
      .from("notes")
      .select("id, r2_key, preview_r2_key, preview_pages, status")
      .eq("id", req.params.id)
      .eq("status", "approved")
      .eq("is_deleted", false)
      .single();

    if (error || !note)
      return res.status(404).json({ error: "Note not found" });

    if (!note.preview_pages || note.preview_pages.length === 0) {
      return res
        .status(404)
        .json({ error: "No preview available for this note" });
    }

    // Use the pre-extracted preview file — never expose the full PDF
    if (!note.preview_r2_key) {
      return res.status(404).json({
        error: "Preview not yet generated for this note",
      });
    }

    const previewUrl = await R2Service.generateDownloadUrl(note.preview_r2_key);

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
  verifyUpload,
  getAvatarUploadUrl,
  confirmAvatarUpload,
  getCoverUploadUrl,
  confirmCoverUpload,
  getImageViewUrl,
  getDownloadUrl,
  getPreviewUrl,
};
