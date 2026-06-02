const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "replace-this-default-secret-for-local-development";

if (!process.env.JWT_SECRET) {
  console.warn(
    "JWT_SECRET not set. Using a fallback secret for local development."
  );
}

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token is required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

module.exports = auth;
