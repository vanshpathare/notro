// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const { GoogleAIFileManager } = require("@google/generative-ai/server");
// const { GetObjectCommand } = require("@aws-sdk/client-s3");
// const fs = require("fs");
// const path = require("path");
// const os = require("os");
// const { pipeline } = require("stream/promises");

// const r2 = require("../config/r2.js");
// const supabase = require("../config/supabase.js");
// const {
//   notifySellerNoteUnderReview,
//   sendToUser,
// } = require("../utils/notifications.js");

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

// // Core AI processing logic shared by both Redis and in-memory execution
// const processAiReviewJob = async (jobData) => {
//   const { noteId, r2Key, title, subject, indexContents, sellerFcmToken } =
//     jobData;
//   console.log(`🤖 Processing AI review for note: ${title} (${noteId})`);

//   // Create a temporary file path on disk (Render allows writes to /tmp)
//   const tempFilePath = path.join(os.tmpdir(), `review_${noteId}.pdf`);
//   let uploadedFile = null;

//   // Step 1 — Download PDF from R2
//   //let pdfBuffer;
//   try {
//     const command = new GetObjectCommand({
//       Bucket: process.env.R2_BUCKET_NAME,
//       Key: r2Key,
//     });
//     const response = await r2.send(command);
//     const chunks = [];
//     for await (const chunk of response.Body) {
//       chunks.push(chunk);
//     }
//     pdfBuffer = Buffer.concat(chunks);
//   } catch (err) {
//     throw new Error(`Failed to download PDF from R2: ${err.message}`);
//   }

//   // Step 2 — Send to Gemini 3.6 Flash
//   let aiResult;
//   try {
//     const model = genAI.getGenerativeModel({
//       model: "gemini-3.6-flash",
//       generationConfig: {
//         temperature: 0.1,
//         maxOutputTokens: 1000,
//       },
//     });

//     const prompt = `You are reviewing a student-uploaded educational note for a marketplace called EduCrit.

// SELLER PROVIDED INFORMATION:
// Title: ${title}
// Subject: ${subject}
// Index/Table of Contents: ${indexContents || "Not provided"}

// YOUR TASK:
// Review the attached PDF and score it on these 4 criteria. Be strict but fair.

// SCORING CRITERIA (each out of 25 points):
// 1. CONTENT RELEVANCE (0-30): Does the PDF content match the title and subject?
// 2. INDEX ACCURACY (0-30): Do the topics listed in the index appear in the PDF?
// 3. CONTENT QUALITY (0-20): Is this educational, readable, and valuable study material?
// 4. ORIGINALITY (0-20): Is the content original and not plagiarized?

// RESPOND IN THIS EXACT JSON FORMAT ONLY. NO OTHER TEXT:
// {
//   "score_relevance": <0-30>,
//   "score_index": <0-30>,
//   "score_quality": <0-20>,
//   "score_originality": <0-20>,
//   "total_score": <0-100>,
//   "decision": "<APPROVE|REVIEW|REJECT>",
//   "reason": "<one sentence explaining the decision>",
//   "flags": ["<any specific concerns, empty array if none>"]
// }

// DECISION RULES:
// - total_score >= 80: decision must be APPROVE
// - total_score 40-79: decision must be REVIEW
// - total_score < 40: decision must be REJECT`;

//     const pdfBase64 = pdfBuffer.toString("base64");

//     const result = await model.generateContent([
//       {
//         inlineData: {
//           mimeType: "application/pdf",
//           data: pdfBase64,
//         },
//       },
//       prompt,
//     ]);

//     const responseText = result.response.text().trim();
//     const jsonMatch = responseText.match(/\{[\s\S]*\}/);
//     if (!jsonMatch) {
//       throw new Error("Gemini did not return valid JSON");
//     }

//     aiResult = JSON.parse(jsonMatch[0]);

//     if (
//       typeof aiResult.total_score !== "number" ||
//       !["APPROVE", "REVIEW", "REJECT"].includes(aiResult.decision)
//     ) {
//       throw new Error("Invalid AI response format");
//     }
//   } catch (err) {
//     console.error(`⚠️ Gemini API error for note ${noteId}:`, err.message);
//     // Fallback behavior if AI fails: force review state so it's marked as pending
//     aiResult = {
//       total_score: 0,
//       decision: "REVIEW",
//       reason: `AI review error: ${err.message}`,
//       flags: ["ai_error"],
//     };
//   }

//   // Step 3 — Update database status (AI failure maps to "pending" for manual check)
//   const newStatus =
//     aiResult.decision === "APPROVE"
//       ? "approved"
//       : aiResult.decision === "REJECT"
//         ? "rejected"
//         : "pending";

//   const rejectionReason =
//     aiResult.decision === "REJECT"
//       ? `Auto-rejected by AI: ${aiResult.reason}`
//       : null;

//   await supabase
//     .from("notes")
//     .update({
//       status: newStatus,
//       rejection_reason: rejectionReason,
//     })
//     .eq("id", noteId);

//   console.log(
//     `✅ Note ${noteId}: AI score ${aiResult.total_score}/100 → status updated to "${newStatus}"`,
//   );

//   // Step 4 — Send Notifications
//   if (sellerFcmToken) {
//     if (newStatus === "approved") {
//       sendToUser(
//         sellerFcmToken,
//         "🎉 Note Approved!",
//         `Your note "${title}" has been approved and is now live on the marketplace.`,
//         { type: "note_approved", noteId },
//       ).catch(() => {});
//     } else if (newStatus === "rejected") {
//       sendToUser(
//         sellerFcmToken,
//         "Note Rejected",
//         `Your note "${title}" was not approved. Reason: ${aiResult.reason}`,
//         { type: "note_rejected", noteId },
//       ).catch(() => {});
//     } else {
//       notifySellerNoteUnderReview(sellerFcmToken, title).catch(() => {});
//     }
//   }
// };

// // ── In-Memory Fallback Implementation ──
// let memoryQueue = [];
// let isMemoryProcessing = false;

// const runInMemoryFallback = (jobData) => {
//   memoryQueue.push(jobData);
//   console.log(
//     `📥 Note ${jobData.noteId} added to local in-memory queue (Redis fallback).`,
//   );
//   processMemoryQueue();
// };

// const processMemoryQueue = async () => {
//   if (isMemoryProcessing || memoryQueue.length === 0) return;
//   isMemoryProcessing = true;
//   const jobData = memoryQueue.shift();

//   try {
//     await processAiReviewJob(jobData);
//   } catch (err) {
//     console.error(
//       `❌ In-memory job execution failed for note ${jobData.noteId}:`,
//       err.message,
//     );
//   } finally {
//     isMemoryProcessing = false;
//     setImmediate(processMemoryQueue);
//   }
// };

// // ── Choose Bull/Redis or Fallback ──
// let activeQueue = null;

// if (process.env.REDIS_URL) {
//   try {
//     const Bull = require("bull");
//     const redisQueue = new Bull("ai-note-review", {
//       redis: process.env.REDIS_URL,
//       defaultJobOptions: {
//         attempts: 3,
//         backoff: { type: "exponential", delay: 5000 },
//         removeOnComplete: 100,
//         removeOnFail: 50,
//       },
//     });

//     redisQueue.process(1, async (job) => {
//       await processAiReviewJob(job.data);
//     });

//     redisQueue.on("error", (err) => {
//       console.warn(
//         "⚠️ Redis connection error detected. Switching jobs to in-memory fallback queue.",
//         err.message,
//       );
//     });

//     activeQueue = {
//       add: async (data) => {
//         try {
//           await redisQueue.add(data);
//         } catch (redisErr) {
//           console.warn(
//             "⚠️ Redis add failed, routing to in-memory fallback:",
//             redisErr.message,
//           );
//           runInMemoryFallback(data);
//         }
//       },
//     };
//     console.log("⚡ Bull Queue initialized with Redis connection.");
//   } catch (setupErr) {
//     console.warn(
//       "⚠️ Failed to boot Redis queue, falling back to local memory queue:",
//       setupErr.message,
//     );
//     activeQueue = { add: (data) => runInMemoryFallback(data) };
//   }
// } else {
//   console.log(
//     "ℹ️ No REDIS_URL found in environment. Using local in-memory queue by default.",
//   );
//   activeQueue = { add: (data) => runInMemoryFallback(data) };
// }

// module.exports = activeQueue;

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { pipeline } = require("stream/promises");

const r2 = require("../config/r2.js");
const supabase = require("../config/supabase.js");
const {
  notifySellerNoteUnderReview,
  sendToUser,
} = require("../utils/notifications.js");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

// ── Core AI Worker: Streams R2 to Disk & Uploads to Google File API ──
const processAiReviewJob = async (jobData) => {
  const { noteId, r2Key, title, subject, indexContents, sellerFcmToken } =
    jobData;
  console.log(`🤖 Processing AI review for note: ${title} (${noteId})`);

  const tempFilePath = path.join(os.tmpdir(), `review_${noteId}.pdf`);
  let uploadedFile = null;

  try {
    // Step 1: Stream directly from R2 to disk (keeps Node RAM under 15MB)
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: r2Key,
    });
    const s3Response = await r2.send(command);
    await pipeline(s3Response.Body, fs.createWriteStream(tempFilePath));

    // Step 2: Upload temporary file to Gemini File API
    console.log(`📤 Uploading ${title} to Gemini File API...`);
    const uploadResult = await fileManager.uploadFile(tempFilePath, {
      mimeType: "application/pdf",
      displayName: `Note: ${title}`,
    });
    uploadedFile = uploadResult.file;

    // Step 3: Run AI scoring via File URI with strict JSON enforcement
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
      },
    });

    const prompt = `You are reviewing a student-uploaded educational note for a marketplace called EduCrit.

SELLER PROVIDED INFORMATION:
Title: ${title}
Subject: ${subject}
Index/Table of Contents: ${indexContents || "Not provided"}

YOUR TASK:
Review the attached PDF and score it on these 4 criteria. Be strict but fair.

SCORING CRITERIA:
1. CONTENT RELEVANCE (0-30): Does the PDF content match the title and subject?
2. INDEX ACCURACY (0-30): Do the topics listed in the index appear in the PDF?
3. CONTENT QUALITY (0-20): Is this educational, readable, and valuable study material?
4. ORIGINALITY (0-20): Is the content original and not plagiarized?

RESPOND IN THIS EXACT JSON FORMAT ONLY:
{
  "score_relevance": <0-30>,
  "score_index": <0-30>,
  "score_quality": <0-20>,
  "score_originality": <0-20>,
  "total_score": <0-100>,
  "decision": "<APPROVE|REVIEW|REJECT>",
  "reason": "<one sentence explaining the decision>",
  "flags": ["<any specific concerns, empty array if none>"]
}

DECISION RULES:
- total_score >= 80: decision must be APPROVE
- total_score 40-79: decision must be REVIEW  
- total_score < 40: decision must be REJECT`;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadedFile.mimeType,
          fileUri: uploadedFile.uri,
        },
      },
      { text: prompt },
    ]);

    const aiResult = JSON.parse(result.response.text());

    // Step 4: Map status & update Supabase
    const newStatus =
      aiResult.decision === "APPROVE"
        ? "approved"
        : aiResult.decision === "REJECT"
          ? "rejected"
          : "pending";

    const rejectionReason =
      aiResult.decision === "REJECT"
        ? `Auto-rejected by AI: ${aiResult.reason}`
        : null;

    await supabase
      .from("notes")
      .update({
        status: newStatus,
        rejection_reason: rejectionReason,
      })
      .eq("id", noteId);

    console.log(`✅ Note ${noteId}: AI verdict -> ${newStatus}`);

    // Step 5: Send notification to seller
    if (sellerFcmToken) {
      if (newStatus === "approved") {
        sendToUser(
          sellerFcmToken,
          "🎉 Note Approved!",
          `Your note "${title}" has been approved.`,
          { type: "note_approved", noteId },
        ).catch(() => {});
      } else if (newStatus === "rejected") {
        sendToUser(
          sellerFcmToken,
          "Note Rejected",
          `Your note "${title}" was rejected: ${aiResult.reason}`,
          { type: "note_rejected", noteId },
        ).catch(() => {});
      } else {
        notifySellerNoteUnderReview(sellerFcmToken, title).catch(() => {});
      }
    }
  } catch (err) {
    console.error(`⚠️ AI evaluation error for note ${noteId}:`, err.message);
    await supabase.from("notes").update({ status: "pending" }).eq("id", noteId);
  } finally {
    // Step 6: Purge local temp file and delete remote asset from Google File API
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (uploadedFile) {
      fileManager.deleteFile(uploadedFile.name).catch(() => {});
    }
  }
};

// ── In-Memory Fallback Queue ──
let memoryQueue = [];
let isMemoryProcessing = false;

const runInMemoryFallback = (jobData) => {
  memoryQueue.push(jobData);
  console.log(`📥 Note ${jobData.noteId} queued in local in-memory fallback.`);
  processMemoryQueue();
};

const processMemoryQueue = async () => {
  if (isMemoryProcessing || memoryQueue.length === 0) return;
  isMemoryProcessing = true;
  const jobData = memoryQueue.shift();

  try {
    await processAiReviewJob(jobData);
  } catch (err) {
    console.error(
      `❌ In-memory job failed for note ${jobData.noteId}:`,
      err.message,
    );
  } finally {
    isMemoryProcessing = false;
    setImmediate(processMemoryQueue);
  }
};

// ── Queue Router: Bull/Redis with In-Memory Fallback ──
let activeQueue = null;

if (process.env.REDIS_URL) {
  try {
    const Bull = require("bull");
    const redisQueue = new Bull("ai-note-review", {
      redis: process.env.REDIS_URL,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    redisQueue.process(1, async (job) => {
      await processAiReviewJob(job.data);
    });

    redisQueue.on("error", (err) => {
      console.warn(
        "⚠️ Redis connection error. Routing jobs to in-memory fallback:",
        err.message,
      );
    });

    activeQueue = {
      add: async (data) => {
        try {
          await redisQueue.add(data);
        } catch (redisErr) {
          console.warn(
            "⚠️ Redis add failed, falling back to in-memory:",
            redisErr.message,
          );
          runInMemoryFallback(data);
        }
      },
    };
    console.log("⚡ Bull Queue initialized with Redis connection.");
  } catch (setupErr) {
    console.warn(
      "⚠️ Failed to boot Bull/Redis, using in-memory queue:",
      setupErr.message,
    );
    activeQueue = { add: (data) => runInMemoryFallback(data) };
  }
} else {
  console.log("ℹ️ No REDIS_URL found. Using in-memory fallback queue.");
  activeQueue = { add: (data) => runInMemoryFallback(data) };
}

module.exports = activeQueue;
