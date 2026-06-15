const pdfParse = require("pdf-parse");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2.js");

const BUCKET = process.env.R2_BUCKET_NAME;

const getPdfPageCount = async (r2Key) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key });
  const response = await r2.send(command);

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  const data = await pdfParse(buffer);
  return data.numpages;
};

const validatePdfContent = async (r2Key) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key });
  const response = await r2.send(command);

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  if (buffer.length < 5 * 1024)
    return { valid: false, reason: "FILE_TOO_SMALL" };
  if (buffer.length > 100 * 1024 * 1024)
    return { valid: false, reason: "FILE_TOO_LARGE" };

  const data = await pdfParse(buffer);

  if (data.numpages < 1) {
    return { valid: false, reason: "TOO_FEW_PAGES", pageCount: data.numpages };
  }

  const textLength = data.text.trim().length;
  if (textLength < 20) {
    return {
      valid: false,
      reason: "INSUFFICIENT_TEXT_CONTENT",
      pageCount: data.numpages,
    };
  }

  return { valid: true, pageCount: data.numpages, fileSize: buffer.length };
};

module.exports = { getPdfPageCount, validatePdfContent };
