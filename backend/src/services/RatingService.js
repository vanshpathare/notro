const supabase = require("../config/supabase.js");

// ─────────────────────────────────────
// Submit a rating — only allowed if purchase exists
// ─────────────────────────────────────
const submitRating = async (buyerId, noteId, stars, reviewText) => {
  if (!stars || stars < 1 || stars > 5) throw new Error("INVALID_STARS");

  // Verify purchase exists and is paid
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("note_id", noteId)
    .eq("status", "paid")
    .maybeSingle();

  if (!purchase) throw new Error("PURCHASE_REQUIRED");

  // Check if already rated
  const { data: existing } = await supabase
    .from("ratings")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("note_id", noteId)
    .maybeSingle();

  if (existing) throw new Error("ALREADY_RATED");

  // Insert rating
  const { data: rating, error } = await supabase
    .from("ratings")
    .insert({
      buyer_id: buyerId,
      note_id: noteId,
      stars: parseInt(stars),
      review_text: reviewText?.trim() || null,
    })
    .select()
    .single();

  if (error) throw error;

  // Recalculate note's average_rating and rating_count
  await recalculateNoteRating(noteId);

  return rating;
};

// ─────────────────────────────────────
// Recalculate average rating for a note
// ─────────────────────────────────────
const recalculateNoteRating = async (noteId) => {
  const { data: allRatings } = await supabase
    .from("ratings")
    .select("stars")
    .eq("note_id", noteId);

  const ratingCount = allRatings?.length || 0;
  const averageRating =
    ratingCount > 0
      ? Math.round(
          (allRatings.reduce((sum, r) => sum + r.stars, 0) / ratingCount) * 10,
        ) / 10
      : 0;

  await supabase
    .from("notes")
    .update({ average_rating: averageRating, rating_count: ratingCount })
    .eq("id", noteId);
};

// ─────────────────────────────────────
// Get all ratings for a note
// ─────────────────────────────────────
const getRatingsForNote = async (noteId) => {
  const { data: ratings, error } = await supabase
    .from("ratings")
    .select(
      `
      id,
      stars,
      review_text,
      created_at,
      profiles ( name, avatar_url )
    `,
    )
    .eq("note_id", noteId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const { data: note } = await supabase
    .from("notes")
    .select("average_rating, rating_count")
    .eq("id", noteId)
    .single();

  // Standardize naming conventions for frontend processing
  const formattedRatings = (ratings || []).map((r) => ({
    id: r.id,
    stars: r.stars,
    review_text: r.review_text,
    created_at: r.created_at,
    buyer: r.profiles || { name: "User", avatar_url: null },
  }));

  return {
    average_rating: note?.average_rating || 0,
    rating_count: note?.rating_count || 0,
    ratings: formattedRatings,
  };
};

module.exports = { submitRating, getRatingsForNote };
