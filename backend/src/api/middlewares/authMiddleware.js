const jwt = require("jsonwebtoken");

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
    };

    // 4. Move smoothly to the controller layer
    next();
  } catch (err) {
    // Catch-all for expired tokens, altered strings, or missing configurations
    return res.status(401).json({ error: "Session expired or invalid token." });
  }
};

module.exports = verifyAuthSession;
