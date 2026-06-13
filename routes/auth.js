/*
 * Public authentication routes.
 * Signup stores bcrypt hashes in MongoDB; login validates credentials and returns
 * a JWT whose id identifies the MongoDB User for later protected requests.
 */
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Signs only the user's stable MongoDB identity and public email.
// The token expires after seven days and is verified by middleware/auth.js.
function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// =====================================================
// POST /auth/signup
// =====================================================
// Called by the signup form with name, email, and plaintext password.
// It checks MongoDB for duplicates, stores a bcrypt hash, and returns safe user data.
router.post("/signup", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    // Email is normalized before both lookup and storage so casing cannot create
    // duplicate accounts.
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Only the hash is written to the users collection; plaintext is never stored.
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }
    res.status(500).json({
      message: "Failed to sign up",
      error: error.message
    });
  }
});

// =====================================================
// POST /auth/login
// =====================================================
// Called by the login form with email/password. It fetches the normalized MongoDB
// user, compares bcrypt hashes, and returns the JWT consumed by protected APIs.
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    // Fetch the account document that owns this normalized email address.
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    res.json({
      message: "Login successful",
      token: createToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to log in",
      error: error.message
    });
  }
});

module.exports = router;
