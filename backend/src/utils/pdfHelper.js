const pdfParse = require("pdf-parse");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2.js");
const { PDFDocument } = require("pdf-lib");

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

  return { valid: true, pageCount: data.numpages, fileSize: buffer.length };
};

// ─────────────────────────────────────
// Extract specific pages from a PDF and return as buffer
// ─────────────────────────────────────
const extractPages = async (sourceBuffer, pageNumbers) => {
  const sourcePdf = await PDFDocument.load(sourceBuffer);
  const previewPdf = await PDFDocument.create();

  const totalPages = sourcePdf.getPageCount();

  // pageNumbers are 1-indexed (as stored in your DB)
  // PDFDocument uses 0-indexed internally
  const validPages = pageNumbers
    .filter((p) => p >= 1 && p <= totalPages)
    .map((p) => p - 1);

  if (validPages.length === 0) throw new Error("NO_VALID_PREVIEW_PAGES");

  const copiedPages = await previewPdf.copyPages(sourcePdf, validPages);
  copiedPages.forEach((page) => previewPdf.addPage(page));

  return await previewPdf.save();
};

const compressPdf = async (inputBuffer) => {
  try {
    const pdfDoc = await PDFDocument.load(inputBuffer, {
      ignoreEncryption: true,
    });

    // Re-save with object streams enabled — reduces file size 10-30%
    const compressedBuffer = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    // Only use compressed version if it's actually smaller
    if (compressedBuffer.length < inputBuffer.length) {
      return Buffer.from(compressedBuffer);
    }
    return inputBuffer;
  } catch (_) {
    // If compression fails, return original
    return inputBuffer;
  }
};

module.exports = {
  getPdfPageCount,
  validatePdfContent,
  extractPages,
  compressPdf,
};
