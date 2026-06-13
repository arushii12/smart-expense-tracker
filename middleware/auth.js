/*
 * JWT authentication middleware used by every protected route.
 * It verifies the Bearer token, rejects legacy/non-Mongo IDs, and exposes the
 * authenticated owner as req.user.id using a real MongoDB ObjectId.
 */
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Protected route flow:
// Authorization header -> JWT verification -> ObjectId validation -> req.user.
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
    const id = decoded.id || decoded.userId;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(401).json({
        message: "This session is no longer valid. Please log in again."
      });
    }
    // Routes use this verified ObjectId in MongoDB filters instead of trusting a
    // userId supplied by the browser.
    req.user = {
      ...decoded,
      id: new mongoose.Types.ObjectId(id)
    };
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid or expired token"
    });
  }
}

module.exports = auth;
