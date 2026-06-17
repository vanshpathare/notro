const supabase = require("../config/supabase.js");

// ─────────────────────────────────────
// Get public seller profile
// ─────────────────────────────────────
const getSellerProfile = async (sellerId, viewerId = null) => {
  const { data: seller, error } = await supabase
    .from("profiles")
    .select(
      "id, name, avatar_url, account_type, verification_status, created_at, extra_details",
    )
    .eq("id", sellerId)
    .single();

  if (error || !seller) throw new Error("SELLER_NOT_FOUND");

  // Get their approved notes
  const { data: notes } = await supabase
    .from("notes")
    .select(
      "id, title, subject, course, price, cover_image_key, purchase_count, average_rating, rating_count",
    )
    .eq("seller_id", sellerId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  // Total notes sold — sum of purchase_count across all their notes
  const totalSold = (notes || []).reduce(
    (sum, n) => sum + (n.purchase_count || 0),
    0,
  );

  // Overall average rating — weighted average across all their notes
  const ratedNotes = (notes || []).filter((n) => n.rating_count > 0);
  let overallRating = 0;
  if (ratedNotes.length > 0) {
    const totalRatingPoints = ratedNotes.reduce(
      (sum, n) => sum + n.average_rating * n.rating_count,
      0,
    );
    const totalRatingCount = ratedNotes.reduce(
      (sum, n) => sum + n.rating_count,
      0,
    );
    overallRating =
      totalRatingCount > 0
        ? Math.round((totalRatingPoints / totalRatingCount) * 10) / 10
        : 0;
  }

  // Follower count
  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", sellerId);

  // Is the viewer following this seller?
  let isFollowing = false;
  if (viewerId) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", viewerId)
      .eq("seller_id", sellerId)
      .maybeSingle();
    isFollowing = !!followRow;
  }

  // Build public-facing name based on account type
  let displayName = seller.name;
  if (seller.account_type === "business")
    displayName = seller.extra_details?.business_name || seller.name;
  if (seller.account_type === "youtube")
    displayName = seller.extra_details?.channel_name || seller.name;

  return {
    id: seller.id,
    name: displayName,
    avatar_url: seller.avatar_url,
    account_type: seller.account_type,
    is_verified:
      seller.verification_status === "approved" &&
      seller.account_type !== "student",
    member_since: seller.created_at,
    stats: {
      total_notes: (notes || []).length,
      total_sold: totalSold,
      average_rating: overallRating,
      follower_count: followerCount || 0,
    },
    is_following: isFollowing,
    notes: notes || [],
  };
};

// ─────────────────────────────────────
// Follow a seller
// ─────────────────────────────────────
const followSeller = async (followerId, sellerId) => {
  if (followerId === sellerId) throw new Error("CANNOT_FOLLOW_SELF");

  // Check seller exists
  const { data: seller } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", sellerId)
    .single();

  if (!seller) throw new Error("SELLER_NOT_FOUND");

  // Check already following
  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (existing) throw new Error("ALREADY_FOLLOWING");

  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: followerId, seller_id: sellerId });

  if (error) throw error;
  return true;
};

// ─────────────────────────────────────
// Unfollow a seller
// ─────────────────────────────────────
const unfollowSeller = async (followerId, sellerId) => {
  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("seller_id", sellerId)
    .maybeSingle();

  if (!existing) throw new Error("NOT_FOLLOWING");

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("seller_id", sellerId);

  if (error) throw error;
  return true;
};

// ─────────────────────────────────────
// Become a seller (students only — flips is_seller flag)
// ─────────────────────────────────────
const becomeSeller = async (userId) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("account_type, is_seller")
    .eq("id", userId)
    .single();

  if (error || !profile) throw new Error("USER_NOT_FOUND");

  if (profile.is_seller) throw new Error("ALREADY_SELLER");

  // Business/YouTube accounts are already sellers from registration
  if (profile.account_type !== "student") {
    throw new Error("NOT_APPLICABLE");
  }

  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ is_seller: true })
    .eq("id", userId)
    .select()
    .single();

  if (updateError) throw updateError;
  return updated;
};

module.exports = {
  getSellerProfile,
  followSeller,
  unfollowSeller,
  becomeSeller,
};
