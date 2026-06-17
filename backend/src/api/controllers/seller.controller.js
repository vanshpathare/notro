const SellerService = require("../../services/SellerService");
const logger = require("../../utils/logger");

// GET /api/sellers/:id/profile
const getSellerProfile = async (req, res) => {
  try {
    const viewerId = req.user?.id || null;
    const profile = await SellerService.getSellerProfile(
      req.params.id,
      viewerId,
    );
    return res.json({ success: true, seller: profile });
  } catch (err) {
    logger.error(`getSellerProfile | ${req.params.id} | ${err.message}`);
    if (err.message === "SELLER_NOT_FOUND") {
      return res.status(404).json({ error: "Seller not found" });
    }
    return res.status(500).json({ error: "Failed to fetch seller profile" });
  }
};

// POST /api/sellers/:id/follow
const followSeller = async (req, res) => {
  try {
    await SellerService.followSeller(req.user.id, req.params.id);
    return res.json({ success: true, message: "Now following this seller" });
  } catch (err) {
    logger.error(`followSeller | ${req.user?.id} | ${err.message}`);
    const map = {
      CANNOT_FOLLOW_SELF: [400, "You cannot follow yourself"],
      SELLER_NOT_FOUND: [404, "Seller not found"],
      ALREADY_FOLLOWING: [409, "You are already following this seller"],
    };
    const [status, message] = map[err.message] || [
      500,
      "Failed to follow seller",
    ];
    return res.status(status).json({ error: message });
  }
};

// DELETE /api/sellers/:id/follow
const unfollowSeller = async (req, res) => {
  try {
    await SellerService.unfollowSeller(req.user.id, req.params.id);
    return res.json({ success: true, message: "Unfollowed successfully" });
  } catch (err) {
    logger.error(`unfollowSeller | ${req.user?.id} | ${err.message}`);
    if (err.message === "NOT_FOLLOWING") {
      return res
        .status(409)
        .json({ error: "You are not following this seller" });
    }
    return res.status(500).json({ error: "Failed to unfollow seller" });
  }
};

module.exports = { getSellerProfile, followSeller, unfollowSeller };
