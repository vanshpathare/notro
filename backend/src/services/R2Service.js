const {
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const r2 = require("../config/r2.js");

const BUCKET = process.env.R2_BUCKET_NAME;

const generateUploadUrl = async (sellerId, fileExtension = "pdf") => {
  const uniqueId = crypto.randomBytes(16).toString("hex");
  const key = `pdfs/${sellerId}/${uniqueId}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: "application/pdf",
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 }); // 15 Mins
  return { uploadUrl, r2_key: key };
};

const generateCoverUploadUrl = async (sellerId, fileExtension = "jpg") => {
  const uniqueId = crypto.randomBytes(16).toString("hex");
  const key = `covers/${sellerId}/${uniqueId}.${fileExtension}`;

  const contentTypeMap = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentTypeMap[fileExtension] || "image/jpeg",
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 900 });
  return { uploadUrl, r2_key: key };
};

const generateDownloadUrl = async (r2Key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
  });

  const downloadUrl = await getSignedUrl(r2, command, { expiresIn: 60 }); // Tight 60s security window
  return downloadUrl;
};

const verifyFileExists = async (r2Key) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
    });
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

const generateCoverViewUrl = async (r2Key) => {
  if (!r2Key) return null;
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
  });
  return await getSignedUrl(r2, command, { expiresIn: 3600 }); // 1 Hour
};

module.exports = {
  generateUploadUrl,
  generateCoverUploadUrl,
  generateDownloadUrl,
  verifyFileExists,
  generateCoverViewUrl,
};
