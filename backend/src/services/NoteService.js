const supabase = require("../config/supabase.js");

// ─────────────────────────────────────
// Create a new note listing
// Called AFTER the PDF has been uploaded to R2
// ─────────────────────────────────────
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
  } = noteData;

  // ── Validate required fields ──
  if (!title?.trim()) throw new Error("TITLE_REQUIRED");
  if (!subject?.trim()) throw new Error("SUBJECT_REQUIRED");
  if (!r2_key?.trim()) throw new Error("R2_KEY_REQUIRED");
  if (price === undefined || isNaN(price)) throw new Error("PRICE_REQUIRED");

  const parsedPrice = parseFloat(price);
  if (parsedPrice < 5) throw new Error("PRICE_OUT_OF_RANGE");
  if (!seller_declaration) throw new Error("DECLARATION_REQUIRED");
  if (!page_count || parseInt(page_count) < 1)
    throw new Error("PAGE_COUNT_REQUIRED");

  // Validate preview pages — max 4 as per constraint
  if (preview_pages && preview_pages.length > 4) {
    throw new Error("TOO_MANY_PREVIEW_PAGES");
  }
  if (preview_pages && preview_pages.length > totalPages) {
    throw new Error("PREVIEW_PAGES_EXCEED_TOTAL");
  }

  // ── Check seller status & verification ──
  const { data: seller, error: sellerError } = await supabase
    .from("profiles")
    .select("id, is_banned, account_type, verification_status")
    .eq("id", sellerId)
    .single();

  if (sellerError || !seller) throw new Error("SELLER_NOT_FOUND");
  if (seller.is_banned) throw new Error("ACCOUNT_BANNED");

  // Business and YouTube accounts must be verified ('approved') before uploading PDFs
  if (
    seller.account_type !== "student" &&
    seller.verification_status !== "approved"
  ) {
    throw new Error("ACCOUNT_PENDING_VERIFICATION");
  }

  const initialStatus =
    seller.account_type === "student" ? "pending" : "approved";

  // ── Insert note row ──
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
      tags: tags || [],
      seller_declaration: true,
      status: initialStatus,
    })
    .select()
    .single();

  if (error) throw error;
  return note;
};

// ─────────────────────────────────────
// Browse approved notes with filters
// ─────────────────────────────────────
const getNotes = async (filters = {}) => {
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

  let query = supabase
    .from("notes")
    .select(
      `
      id,
      title,
      description,
      subject,
      course,
      price,
      purchase_count,
      average_rating,
      rating_count,
      tags,
      index_contents,
      cover_image_key,
      page_count,
      created_at,
      seller_id,
      seller:profiles!seller_id (
        id,
        name,
        avatar_url,
        account_type,
        verification_status
      )
    `,
      { count: "exact" },
    )
    .eq("status", "approved");

  // ── Apply filters ──
  if (subject) query = query.ilike("subject", `%${subject}%`);
  if (course) query = query.ilike("course", `%${course}%`);
  if (min_price) query = query.gte("price", parseFloat(min_price));
  if (max_price) query = query.lte("price", parseFloat(max_price));

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,subject.ilike.%${search}%,description.ilike.%${search}%`,
    );
  }

  // ── Sorting ──
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

  // ── Pagination ──
  const pageNum = parseInt(page);
  const pageSize = parseInt(limit);
  const from = (pageNum - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: notes, error, count } = await query;
  if (error) throw error;

  return {
    notes: notes || [],
    pagination: {
      total: count,
      page: pageNum,
      limit: pageSize,
      total_pages: Math.ceil(count / pageSize),
    },
  };
};

// ─────────────────────────────────────
// Get single approved note by ID
// ─────────────────────────────────────
const getNoteById = async (noteId, viewerId = null) => {
  const { data: note, error } = await supabase
    .from("notes")
    .select(
      `
      *,
      seller:profiles!seller_id (
        id,
        name,
        avatar_url,
        account_type,
        verification_status
      )
    `,
    )
    .eq("id", noteId)
    .eq("status", "approved") // 🔒 Strict barrier for buyers
    .single();

  if (error || !note) throw new Error("NOTE_NOT_FOUND");

  // Fire and forget — non-blocking background tracking
  Promise.all([
    supabase.from("note_views").insert({
      note_id: noteId,
      user_id: viewerId || null,
      source: "direct",
    }),
    supabase
      .from("notes")
      .update({
        view_count: (note.view_count || 0) + 1,
      })
      .eq("id", noteId),
  ]).catch((err) => console.error(`[TRACKING ERROR]: ${err.message}`));

  // ── Check if viewer has purchased this note ──
  let has_purchased = false;
  if (viewerId) {
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id")
      .eq("user_id", viewerId)
      .eq("note_id", noteId)
      .maybeSingle();

    has_purchased = !!purchase;
  }

  return { ...note, has_purchased };
};

// ─────────────────────────────────────
// Seller edits their own note
// ─────────────────────────────────────
// ─────────────────────────────────────
// Seller edits their own note
// ─────────────────────────────────────
const updateNote = async (noteId, sellerId, updates) => {
  // 🎯 FIX 4: Joined profile parameters into query so account_type checking works cleanly
  const { data: note, error: fetchError } = await supabase
    .from("notes")
    .select(
      `
      id, 
      seller_id, 
      status,
      seller:profiles!seller_id (account_type)
    `,
    )
    .eq("id", noteId)
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
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  if (Object.keys(filteredUpdates).length === 0)
    throw new Error("NO_VALID_FIELDS");

  if (filteredUpdates.price !== undefined) {
    const p = parseFloat(filteredUpdates.price);
    if (isNaN(p) || p < 5) throw new Error("PRICE_OUT_OF_RANGE");
  }

  if (filteredUpdates.preview_pages) {
    if (filteredUpdates.preview_pages.length > 4) {
      throw new Error("TOO_MANY_PREVIEW_PAGES");
    }

    // Determine total pages available (either from the incoming update payload or the database row)
    const activeTotalPages =
      filteredUpdates.page_count !== undefined
        ? parseInt(filteredUpdates.page_count)
        : note.page_count;

    if (filteredUpdates.preview_pages.length > activeTotalPages) {
      throw new Error("PREVIEW_PAGES_EXCEED_TOTAL");
    }
  }

  // Fields that trigger re-review if changed
  const sensitiveFields = ["title", "description", "index_contents", "subject"];

  const touchedSensitive = sensitiveFields.some(
    (field) => filteredUpdates[field] !== undefined,
  );

  // 🎯 Fix verified verification chain targeting the alias key 'seller'
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
  return updated;
};

// ─────────────────────────────────────
// Get seller's own listings
// ─────────────────────────────────────
const getMyListings = async (sellerId) => {
  const { data: notes, error } = await supabase
    .from("notes")
    .select(
      `
      id,
      title,
      subject,
      course,
      price,
      status,
      rejection_reason,
      purchase_count,
      view_count,
      average_rating,
      rating_count,
      page_count,
      created_at,
      updated_at
    `,
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return notes || [];
};

// ─────────────────────────────────────
// Get note for seller analytics
// ─────────────────────────────────────
const getNoteAnalytics = async (noteId, sellerId) => {
  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("seller_id", sellerId)
    .single();

  if (noteError || !note) throw new Error("NOTE_NOT_FOUND");

  const { data: purchaseStats } = await supabase
    .from("purchases")
    .select("seller_earning")
    .eq("note_id", noteId);

  const totalEarned =
    purchaseStats?.reduce(
      (sum, p) => sum + parseFloat(p.seller_earning || 0),
      0,
    ) || 0;
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

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  getMyListings,
  getNoteAnalytics,
};
