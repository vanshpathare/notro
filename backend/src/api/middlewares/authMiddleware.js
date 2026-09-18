const jwt = require("jsonwebtoken");
const supabase = require("../../config/supabase");

const verifyAuthSession = async (req, res, next) => {
  try {
    // 1. Grab your custom token out of the cookie jar or authorization header
    const token =
      req.cookies?.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res
        .status(401)
        .json({ error: "Authentication required. Please log in." });
    }

    // 2. Production-safe verification using your custom secret
    // If anyone tries to modify or forge a token, this line throws an error immediately
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach the verified user details to the request lifecycle
    // This matches what your verification route injects into the payload (id, email, account_type, etc.)
    req.user = {
      id: decoded.id || decoded.sub,
      email: decoded.email,
      account_type: decoded.account_type,
      platform: decoded.platform || "web",
      appSessionId: decoded.appSessionId || null,
    };

    // 4. Move smoothly to the controller layer
    next();
  } catch (err) {
    // Catch-all for expired tokens, altered strings, or missing configurations
    return res.status(401).json({ error: "Session expired or invalid token." });
  }
};

const appSessionGuard = async (req, res, next) => {
  try {
    // Block access if not called from the mobile app
    if (req.user?.platform !== "app" || !req.user?.appSessionId) {
      return res.status(403).json({
        error: "APP_ONLY_FEATURE",
        message: "Purchased notes can only be viewed inside the mobile app.",
      });
    }

    // Check if another phone has logged in since
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("app_session_id")
      .eq("id", req.user.id)
      .single();

    if (error || !profile) {
      return res.status(401).json({ error: "Profile not found." });
    }

    // Kick out if another device has taken the active session
    if (profile.app_session_id !== req.user.appSessionId) {
      return res.status(401).json({
        error: "SESSION_REPLACED",
        message:
          "Your account was logged in on another device. Please sign in again.",
      });
    }

    next();
  } catch (err) {
    return res.status(500).json({ error: "Session validation failed." });
  }
};

module.exports = { verifyAuthSession, appSessionGuard };
