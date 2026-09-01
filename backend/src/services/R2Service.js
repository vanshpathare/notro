const {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const r2 = require("../config/r2.js");
const { r2Public } = require("../config/r2.js");

const BUCKET = process.env.R2_BUCKET_NAME;

const generateUploadUrl = async (sellerId, fileExtension = "pdf") => {
  const uniqueId = crypto.randomBytes(16).toString("hex");
  const key = `pdfs/${sellerId}/${uniqueId}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: "application/pdf",
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 });

  // Track upload intent to handle orphan cleanup
  const supabase = require("../config/supabase.js");
  await supabase.from("upload_intents").insert({
    seller_id: sellerId,
    r2_key: key,
    claimed: false,
  });

  return { uploadUrl, r2_key: key };
};

// ─────────────────────────────────────
// Avatar upload URL — for profile pictures
// ─────────────────────────────────────
const generateAvatarUploadUrl = async (userId, fileExtension = "jpg") => {
  const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
  if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
    throw new Error("INVALID_IMAGE_FORMAT");
  }

  const contentTypeMap = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

  const uniqueId = crypto.randomBytes(16).toString("hex");
  const key = `avatars/${userId}/${uniqueId}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentTypeMap[fileExtension] || "image/jpeg",
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 });
  return { uploadUrl, r2_key: key };
};

// ─────────────────────────────────────
// Cover image upload URL — for note thumbnails
// ─────────────────────────────────────
const generateCoverUploadUrl = async (sellerId, fileExtension = "jpg") => {
  const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
  if (!allowedExtensions.includes(fileExtension.toLowerCase())) {
    throw new Error("INVALID_IMAGE_FORMAT");
  }

  const contentTypeMap = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

  const uniqueId = crypto.randomBytes(16).toString("hex");
  const key = `covers/${sellerId}/${uniqueId}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentTypeMap[fileExtension] || "image/jpeg",
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 });
  return { uploadUrl, r2_key: key };
};

// ─────────────────────────────────────
// Generate a presigned GET URL for viewing images
// Used for avatars and cover images
// ─────────────────────────────────────
const generateImageViewUrl = async (r2Key) => {
  if (!r2Key) return null;

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
  });

  // 1 hour expiry for images — they're not sensitive content
  const url = await getSignedUrl(r2, command, { expiresIn: 3600 });
  return url;
};

const generateDownloadUrl = async (r2Key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
  });
  const downloadUrl = await getSignedUrl(r2, command, { expiresIn: 60 });
  return downloadUrl;
};

const verifyFileExists = async (r2Key) => {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET, Key: r2Key });
    const result = await r2.send(command);
    return {
      exists: true,
      size: result.ContentLength,
      contentType: result.ContentType,
    };
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    throw err;
  }
};

const deleteFile = async (r2Key) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key });
  await r2.send(command);
};

const uploadPreviewPdf = async (noteId, previewBuffer) => {
  const key = `previews/${noteId}.pdf`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: previewBuffer,
    ContentType: "application/pdf",
  });

  await r2.send(command);
  return key;
};

// ─────────────────────────────────────
// Upload image buffer to PUBLIC bucket
// Returns permanent public URL — no signing needed ever again
// Used for avatars and cover images
// ─────────────────────────────────────
const uploadToPublicBucket = async (
  key,
  buffer,
  contentType = "image/jpeg",
) => {
  const { PutObjectCommand } = require("@aws-sdk/client-s3");

  console.log(
    "UPDATING PUBLIC BUCKET NAME:",
    process.env.R2_PUBLIC_BUCKET_NAME,
  );
  console.log("TARGET KEY:", key);

  const command = new PutObjectCommand({
    Bucket: process.env.R2_PUBLIC_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  // await r2Public.send(command);
  const res = await r2Public.send(command);
  console.log("CLOUDFLARE PUBLIC UPLOAD RESULT:", res);

  // Return the permanent public URL
  return `${process.env.R2_PUBLIC_URL}/${key}`;
};

// ─────────────────────────────────────
// Delete file from PUBLIC bucket
// Called when user uploads a new avatar/cover to replace old one
// ─────────────────────────────────────
const deleteFromPublicBucket = async (key) => {
  const { DeleteObjectCommand } = require("@aws-sdk/client-s3");

  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_PUBLIC_BUCKET_NAME,
    Key: key,
  });

  await r2Public.send(command);
};

// ─────────────────────────────────────
// Generate presigned upload URL for avatar — points to PRIVATE bucket
// After upload, confirmAvatarUpload will move it to public bucket
// ─────────────────────────────────────
const generatePublicAvatarUploadUrl = async (userId, extension = "jpg") => {
  // Deterministic key — same user always overwrites same file in public bucket
  const publicKey = `avatars/${userId}/profile.${extension}`;
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${publicKey}`;

  return { publicKey, publicUrl };
};

module.exports = {
  generateUploadUrl,
  generateAvatarUploadUrl,
  generateCoverUploadUrl,
  generateDownloadUrl,
  generateImageViewUrl,
  verifyFileExists,
  deleteFile,
  uploadPreviewPdf,
  uploadToPublicBucket,
  deleteFromPublicBucket,
  generatePublicAvatarUploadUrl,
};
