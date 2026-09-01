const supabase = require("../config/supabase.js");
const aiReviewQueue = require("../queues/aiReviewQueue");
const {
  notifyFollowers,
  notifySellerNoteUnderReview,
} = require("../utils/notifications.js");

const NOTE_LIMITS = {
  title: { max: 75, name: "Title" },
  description: { max: 500, name: "Description" },
  index_contents: { max: 800, name: "Index contents" },
  tags: { maxCount: 5, maxLength: 30, name: "Tags" },
};

const validateNoteFields = (data) => {
  if (data.title !== undefined) {
    if (!data.title.trim()) throw new Error("TITLE_REQUIRED");
    if (data.title.trim().length > NOTE_LIMITS.title.max) {
      throw new Error("TITLE_TOO_LONG");
    }
  }
  if (data.description !== undefined && data.description) {
    if (data.description.length > NOTE_LIMITS.description.max) {
      throw new Error("DESCRIPTION_TOO_LONG");
    }
  }
  if (data.index_contents !== undefined && data.index_contents) {
    if (data.index_contents.length > NOTE_LIMITS.index_contents.max) {
      throw new Error("INDEX_TOO_LONG");
    }
  }
  if (data.tags !== undefined) {
    if (data.tags.length > NOTE_LIMITS.tags.maxCount) {
      throw new Error("TOO_MANY_TAGS");
    }
    const longTag = data.tags.find(
      (t) => t && String(t).length > NOTE_LIMITS.tags.maxLength,
    );
    if (longTag) throw new Error("TAG_TOO_LONG");
  }
};

const createNote = async (sellerId, noteData) => {
  const {
    title,
    description,
    subject,
    course,
    price,
    r2_key,
    cover_image_key,
    page_count,
    preview_pages,
    index_contents,
    tags,
    seller_declaration,
    preview_r2_key,
  } = noteData;

  if (!title?.trim()) throw new Error("TITLE_REQUIRED");
  if (!subject?.trim()) throw new Error("SUBJECT_REQUIRED");
  if (!r2_key?.trim()) throw new Error("R2_KEY_REQUIRED");
  if (price === undefined || isNaN(price)) throw new Error("PRICE_REQUIRED");

  const parsedPrice = parseFloat(price);
  if (parsedPrice < 3) throw new Error("PRICE_OUT_OF_RANGE");
  if (!seller_declaration) throw new Error("DECLARATION_REQUIRED");
  if (!page_count || parseInt(page_count) < 1)
    throw new Error("PAGE_COUNT_REQUIRED");
  if (preview_pages && preview_pages.length > 4)
    throw new Error("TOO_MANY_PREVIEW_PAGES");

  validateNoteFields({ title, description, index_contents, tags });

  const { data: seller, error: sellerError } = await supabase
    .from("profiles")
    .select("id, is_banned, account_type, verification_status, is_deleted")
    .eq("id", sellerId)
    .single();

  if (sellerError || !seller) throw new Error("SELLER_NOT_FOUND");
  if (seller.is_banned || seller.is_deleted) throw new Error("ACCOUNT_BANNED");

  if (
    seller.account_type !== "student" &&
    seller.verification_status !== "approved"
  ) {
    throw new Error("ACCOUNT_PENDING_VERIFICATION");
  }

  const initialStatus =
    seller.account_type === "student" ? "pending" : "approved";

  // Normalise tags — remove #, trim, lowercase
  const normalisedTags = (tags || [])
    .map((t) => t.replace(/^#/, "").trim().toLowerCase())
    .filter((t) => t.length > 0)
    .slice(0, 5);

  const { data: note, error } = await supabase
    .from("notes")
    .insert({
      seller_id: sellerId,
      title: title.trim(),
      description: description?.trim() || null,
      subject: subject.trim(),
      course: course?.trim() || null,
      price: parsedPrice,
      r2_key: r2_key.trim(),
      cover_image_key: cover_image_key || null,
      page_count: parseInt(page_count),
      preview_pages: preview_pages || [],
      index_contents: index_contents?.trim() || null,
      tags: normalisedTags,
      seller_declaration: true,
      status: initialStatus,
      is_deleted: false,
      preview_r2_key: preview_r2_key || null,
    })
    .select()
    .single();

  if (error) throw error;

  try {
    await supabase
      .from("upload_intents")
      .update({ claimed: true })
      .eq("r2_key", r2_key);
  } catch (intentError) {
    // Log the error for debugging, but don't crash the note creation if it fails
    console.error("Failed to claim upload intent:", intentError.message);
  }

  try {
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("fcm_token")
      .eq("id", sellerId)
      .single();

    await aiReviewQueue.add({
      noteId: note.id,
      r2Key: r2_key.trim(),
      title: title.trim(),
      subject: subject.trim(),
      indexContents: index_contents?.trim() || "",
      sellerFcmToken: sellerProfile?.fcm_token || null,
    });
  } catch (queueErr) {
    console.error("Failed to enqueue note for AI review:", queueErr.message);
  }

  return note;
};

// const getNotes = async (filters = {}, requestingUserId = null) => {
//   const {
//     search,
//     subject,
//     course,
//     min_price,
//     max_price,
//     sort_by,
//     page = 1,
//     limit = 20,
//   } = filters;

//   let query = supabase
//     .from("notes")
//     .select(
//       `
//       id, title, description, subject, course, price,
//       purchase_count, average_rating, rating_count,
//       tags, index_contents, cover_image_key, page_count, created_at, seller_id,
//       seller:profiles!seller_id (
//         id, name, avatar_url, account_type, verification_status
//       )
//     `,
//       { count: "exact" },
//     )
//     .eq("status", "approved")
//     .eq("is_deleted", false);

//   if (subject) query = query.ilike("subject", `%${subject}%`);
//   if (course) query = query.ilike("course", `%${course}%`);
//   if (min_price) query = query.gte("price", parseFloat(min_price));
//   if (max_price) query = query.lte("price", parseFloat(max_price));

//   if (search) {
//     const sanitizedQuery = search.trim();

//     const ftsQuery = sanitizedQuery
//       .split(/\s+/)
//       .filter((word) => word.length > 0)
//       .join(" & ");

//     query = query.or(
//       `title.ilike.%${sanitizedQuery}%,` +
//         `subject.ilike.%${sanitizedQuery}%,` +
//         `course.ilike.%${sanitizedQuery}%,` +
//         `description.ilike.%${sanitizedQuery}%,` +
//         `index_contents.ilike.%${sanitizedQuery}%,` +
//         `search_vector.fts.${ftsQuery}`,
//     );
//   }

//   switch (sort_by) {
//     case "price_low":
//       query = query.order("price", { ascending: true });
//       break;
//     case "price_high":
//       query = query.order("price", { ascending: false });
//       break;
//     case "most_bought":
//       query = query.order("purchase_count", { ascending: false });
//       break;
//     case "top_rated":
//       query = query.order("average_rating", { ascending: false });
//       break;
//     case "newest":
//     default:
//       query = query.order("created_at", { ascending: false });
//       break;
//   }

//   const pageNum = parseInt(page);
//   const pageSize = Math.min(parseInt(limit), 50);
//   const from = (pageNum - 1) * pageSize;
//   const to = from + pageSize - 1;
//   query = query.range(from, to);

//   const { data: notes, error, count } = await query;
//   if (error) throw error;

//   // Log search query for analytics — non-blocking
//   if (search && search.trim().length > 0) {
//     (async () => {
//       try {
//         await supabase.from("search_queries").insert({
//           user_id: requestingUserId || null,
//           query: search.trim(),
//           results_count: count || 0,
//         });
//       } catch (analyticsError) {
//         console.error("Analytics logging failed:", analyticsError.message);
//       }
//     })();
//   }

//   return {
//     notes: notes || [],
//     pagination: {
//       total: count || 0,
//       page: pageNum,
//       limit: pageSize,
//       total_pages: Math.ceil((count || 0) / pageSize),
//     },
//   };
// };
const getNotes = async (filters = {}, requestingUserId = null) => {
  const {
    search,
    subject,
    course,
    min_price,
    max_price,
    sort_by,
    page = 1,
    limit = 20,
  } = filters;

  const pageNum = parseInt(page);
  const pageSize = Math.min(parseInt(limit), 50);
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;

  // ── Personalized feed — only on first page, only for logged-in users ──
  let personalizedNotes = [];
  let personalizedNoteIds = [];

  if (requestingUserId && pageNum === 1 && !search) {
    // Get sellers this user follows
    const { data: follows } = await supabase
      .from("follows")
      .select("seller_id")
      .eq("follower_id", requestingUserId);

    if (follows && follows.length > 0) {
      const sellerIds = follows.map((f) => f.seller_id);

      // Get recent notes from followed sellers
      const { data: followedNotes } = await supabase
        .from("notes")
        .select(
          `
          id, title, description, subject, course, price,
          purchase_count, average_rating, rating_count,
          tags, index_contents, cover_image_key, page_count,
          created_at, seller_id,
          seller:profiles!seller_id (
            id, name, avatar_url, account_type, verification_status
          )
        `,
        )
        .in("seller_id", sellerIds)
        .eq("status", "approved")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(8); // Max 8 personalized notes at top of feed

      if (followedNotes && followedNotes.length > 0) {
        personalizedNotes = followedNotes;
        personalizedNoteIds = followedNotes.map((n) => n.id);
      }
    }
  }

  // ── Main query ──
  let query = supabase
    .from("notes")
    .select(
      `
      id, title, description, subject, course, price,
      purchase_count, average_rating, rating_count,
      tags, index_contents, cover_image_key, page_count, created_at, seller_id,
      seller:profiles!seller_id (
        id, name, avatar_url, account_type, verification_status
      )
    `,
      { count: "exact" },
    )
    .eq("status", "approved")
    .eq("is_deleted", false);

  // Exclude personalized notes from main query to avoid duplicates
  if (personalizedNoteIds.length > 0) {
    query = query.not(
      "id",
      "in",
      `(${personalizedNoteIds.map((id) => `"${id}"`).join(",")})`,
    );
  }

  if (subject) query = query.ilike("subject", `%${subject}%`);
  if (course) query = query.ilike("course", `%${course}%`);
  if (min_price) query = query.gte("price", parseFloat(min_price));
  if (max_price) query = query.lte("price", parseFloat(max_price));

  if (search) {
    const sanitizedQuery = search.trim();
    const ftsQuery = sanitizedQuery
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .join(" & ");

    query = query.or(
      `title.ilike.%${sanitizedQuery}%,` +
        `subject.ilike.%${sanitizedQuery}%,` +
        `course.ilike.%${sanitizedQuery}%,` +
        `description.ilike.%${sanitizedQuery}%,` +
        `index_contents.ilike.%${sanitizedQuery}%,` +
        `search_vector.fts.${ftsQuery}`,
    );
  }

  switch (sort_by) {
    case "price_low":
      query = query.order("price", { ascending: true });
      break;
    case "price_high":
      query = query.order("price", { ascending: false });
      break;
    case "most_bought":
      query = query.order("purchase_count", { ascending: false });
      break;
    case "top_rated":
      query = query.order("average_rating", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  query = query.range(from, to);

  const { data: generalNotes, error, count } = await query;
  if (error) throw error;

  // ── Merge: personalized first, then general ──
  const notes = [...personalizedNotes, ...(generalNotes || [])];

  // ── Analytics logging — non-blocking ──
  if (search && search.trim().length > 0) {
    (async () => {
      try {
        await supabase.from("search_queries").insert({
          user_id: requestingUserId || null,
          query: search.trim(),
          results_count: count || 0,
        });
      } catch (analyticsError) {
        console.error("Analytics logging failed:", analyticsError.message);
      }
    })();
  }

  return {
    notes,
    pagination: {
      total: (count || 0) + personalizedNoteIds.length,
      page: pageNum,
      limit: pageSize,
      total_pages: Math.ceil(
        ((count || 0) + personalizedNoteIds.length) / pageSize,
      ),
    },
  };
};

const getNoteById = async (noteId, userId = null) => {
  // First try to get the note normally
  let { data: note, error } = await supabase
    .from("notes")
    .select(
      `
            id, title, description, subject, course, price,
            purchase_count, view_count, average_rating, rating_count,
            tags, index_contents, cover_image_key, preview_r2_key,
            page_count, preview_pages, status, r2_key, seller_id,
            rejection_reason, created_at,
            seller:profiles!seller_id (
                id, name, avatar_url, account_type, verification_status
            )
        `,
    )
    .eq("id", noteId)
    .eq("is_deleted", false)
    .single();

  // If note is deleted but user purchased it, still allow access
  if ((error || !note) && userId) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("note_id", noteId)
      .eq("buyer_id", userId)
      .eq("status", "paid")
      .maybeSingle();

    if (purchase) {
      // Buyer has access — fetch even deleted note
      const { data: deletedNote, error: e2 } = await supabase
        .from("notes")
        .select(
          `
                    id, title, description, subject, course, price,
                    purchase_count, view_count, average_rating, rating_count,
                    tags, index_contents, cover_image_key, preview_r2_key,
                    page_count, preview_pages, status, r2_key, seller_id,
                    rejection_reason, created_at,
                    seller:profiles!seller_id (
                        id, name, avatar_url, account_type, verification_status
                    )
                `,
        )
        .eq("id", noteId)
        .single();

      if (e2 || !deletedNote) throw new Error("NOTE_NOT_FOUND");
      note = deletedNote;
    } else {
      throw new Error("NOTE_NOT_FOUND");
    }
  } else if (error || !note) {
    throw new Error("NOTE_NOT_FOUND");
  }

  // Check if user has purchased
  let hasPurchased = false;
  if (userId) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("note_id", noteId)
      .eq("buyer_id", userId)
      .eq("status", "paid")
      .maybeSingle();
    hasPurchased = !!purchase;
  }

  return { ...note, has_purchased: hasPurchased };
};

const updateNote = async (noteId, sellerId, updates) => {
  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select(
      `
      id, seller_id, status, page_count, r2_key, title, subject, index_contents,
      seller:profiles!seller_id ( account_type, fcm_token )
    `,
    )
    .eq("id", noteId)
    .eq("is_deleted", false)
    .single();

  if (fetchError || !note) throw new Error("NOTE_NOT_FOUND");
  if (note.seller_id !== sellerId) throw new Error("NOT_YOUR_NOTE");

  const allowedFields = [
    "title",
    "description",
    "subject",
    "course",
    "price",
    "index_contents",
    "tags",
    "preview_pages",
  ];

  const filteredUpdates = {};
  for (const key of allowedFields) {
    if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
  }

  if (Object.keys(filteredUpdates).length === 0)
    throw new Error("NO_VALID_FIELDS");

  validateNoteFields(filteredUpdates);

  if (filteredUpdates.price !== undefined) {
    const p = parseFloat(filteredUpdates.price);
    if (isNaN(p) || p < 3) throw new Error("PRICE_OUT_OF_RANGE");
  }

  if (filteredUpdates.preview_pages) {
    if (filteredUpdates.preview_pages.length > 4) {
      throw new Error("TOO_MANY_PREVIEW_PAGES");
    }
    if (filteredUpdates.preview_pages.length > note.page_count) {
      throw new Error("PREVIEW_PAGES_EXCEED_TOTAL");
    }
  }

  // Normalise tags if being updated
  if (filteredUpdates.tags) {
    filteredUpdates.tags = filteredUpdates.tags
      .map((t) => t.replace(/^#/, "").trim().toLowerCase())
      .filter((t) => t.length > 0)
      .slice(0, 5);
  }

  const sensitiveFields = ["title", "description", "index_contents", "subject"];
  const touchedSensitive = sensitiveFields.some(
    (f) => filteredUpdates[f] !== undefined,
  );

  if (
    note.status === "approved" &&
    note.seller?.account_type === "student" &&
    touchedSensitive
  ) {
    filteredUpdates.status = "pending";
  }

  const { data: updated, error } = await supabase
    .from("notes")
    .update(filteredUpdates)
    .eq("id", noteId)
    .select()
    .single();

  if (error) throw error;

  if (updated.status === "pending" && touchedSensitive) {
    try {
      await aiReviewQueue.add({
        noteId: updated.id,
        r2Key: note.r2_key,
        title: updated.title || note.title,
        subject: updated.subject || note.subject,
        indexContents: updated.index_contents || note.index_contents || "",
        sellerFcmToken: note.seller?.fcm_token || null,
      });
      console.log(
        `🔄 Note ${noteId} re-enqueued for AI review due to sensitive field updates.`,
      );
    } catch (queueErr) {
      console.error(
        "Failed to re-enqueue updated note for AI review:",
        queueErr.message,
      );
    }
  }

  // Notify seller if note sent back for review
  if (
    note.status === "approved" &&
    note.seller?.account_type === "student" &&
    touchedSensitive &&
    note.seller?.fcm_token
  ) {
    notifySellerNoteUnderReview(note.seller.fcm_token, updated.title).catch(
      () => {},
    );
  }

  return updated;
};

const getMyListings = async (sellerId) => {
  const { data: notes, error } = await supabase
    .from("notes")
    .select(
      `
      id, title, subject, course, price, status,
      rejection_reason, purchase_count, view_count,
      average_rating, rating_count, page_count,
      created_at, updated_at, is_deleted
    `,
    )
    .eq("seller_id", sellerId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return notes || [];
};

const getNoteAnalytics = async (noteId, sellerId) => {
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("seller_id", sellerId)
    .eq("is_deleted", false)
    .single();

  if (noteError || !note) throw new Error("NOTE_NOT_FOUND");

  const { data: purchaseStats } = await supabase
    .from("purchases")
    .select("seller_earning")
    .eq("note_id", noteId);

  const totalEarned =
    Math.round(
      (purchaseStats || []).reduce(
        (sum, p) => sum + parseFloat(p.seller_earning || 0),
        0,
      ) * 100,
    ) / 100;

  const conversionRate =
    note.view_count > 0
      ? ((note.purchase_count / note.view_count) * 100).toFixed(1)
      : 0;

  return {
    note,
    analytics: {
      total_earned: totalEarned,
      purchase_count: note.purchase_count,
      view_count: note.view_count,
      conversion_rate: `${conversionRate}%`,
      average_rating: note.average_rating,
      rating_count: note.rating_count,
    },
  };
};

// Soft delete a note — never hard delete if purchases exist
const softDeleteNote = async (noteId, sellerId) => {
  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select("id, seller_id")
    .eq("id", noteId)
    .single();

  if (fetchError || !note) throw new Error("NOTE_NOT_FOUND");
  if (note.seller_id !== sellerId) throw new Error("NOT_YOUR_NOTE");

  // Check if any purchases exist
  const { count } = await supabase
    .from("purchases")
    .select("*", { count: "exact", head: true })
    .eq("note_id", noteId)
    .eq("status", "paid");

  if (count > 0) {
    // Has purchases — soft delete only
    await supabase
      .from("notes")
      .update({ is_deleted: true, status: "rejected" })
      .eq("id", noteId);
    return {
      deleted: true,
      type: "soft",
      message: "Note hidden. Existing buyers retain access.",
    };
  }

  // No purchases — safe to hard delete
  await supabase.from("notes").delete().eq("id", noteId);
  return { deleted: true, type: "hard", message: "Note permanently deleted." };
};

const notifyFollowersOfNewNote = async (noteId, sellerId) => {
  // Kick off the operations in the background without 'await'-ing them in the main thread
  Promise.all([
    supabase.from("notes").select("title").eq("id", noteId).single(),
    supabase.from("profiles").select("name").eq("id", sellerId).single(),
  ])
    .then(([noteRes, sellerRes]) => {
      if (noteRes.data && sellerRes.data) {
        // Fire the multicast notification loop to all registered follower devices
        return notifyFollowers(
          sellerId,
          sellerRes.data.name,
          noteRes.data.title,
          noteId,
        );
      }
    })
    .catch((err) => {
      // Gracefully catch background execution exceptions so the admin route never stalls
      console.error(
        "⚠️ Silent Follower Broadcast Notification Error:",
        err.message,
      );
    });
};

const recordView = async (noteId, userId) => {
  if (!userId) return; // Ignore anonymous views

  try {
    // Check if this user has already viewed this note
    const { data: existing } = await supabase
      .from("note_views")
      .select("id")
      .eq("note_id", noteId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) return; // Already viewed — zero database writes after first time

    // First time viewing — insert view record
    await supabase.from("note_views").insert({
      note_id: noteId,
      user_id: userId,
      viewed_at: new Date().toISOString(),
    });

    // Increment view count via atomic function
    await supabase.rpc("increment_view_count", { note_id: noteId });
  } catch (err) {
    console.error("recordView failed:", err.message);
  }
};

// const recordView = async (noteId, userId) => {
//   if (!userId) {
//     console.log("recordView skipped: No userId (guest)");
//     return;
//   }

//   try {
//     // Check if this user has already viewed this note
//     const { data: existing, error: fetchError } = await supabase
//       .from("note_views")
//       .select("id")
//       .eq("note_id", noteId)
//       .eq("user_id", userId)
//       .maybeSingle();

//     if (fetchError) {
//       console.error("recordView fetch error:", fetchError.message);
//     }

//     if (existing) {
//       console.log("recordView skipped: User already viewed this note");
//       return;
//     }

//     // First time viewing — insert view record
//     const { error: insertError } = await supabase.from("note_views").insert({
//       note_id: noteId,
//       user_id: userId,
//       source: "direct",
//       viewed_at: new Date().toISOString(),
//     });

//     if (insertError) {
//       console.error("recordView insert error:", insertError.message);
//       return;
//     }

//     // Increment view count via atomic function
//     const { error: rpcError } = await supabase.rpc("increment_view_count", {
//       note_id: noteId,
//     });
//     if (rpcError) {
//       console.error("recordView rpc error:", rpcError.message);
//     } else {
//       console.log("SUCCESS: View successfully counted for note:", noteId);
//     }
//   } catch (err) {
//     console.error("recordView exception failed:", err.message);
//   }
// };

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  getMyListings,
  getNoteAnalytics,
  softDeleteNote,
  notifyFollowersOfNewNote,
  recordView,
  NOTE_LIMITS,
};
