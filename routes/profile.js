/*
 * Protected profile API.
 * The frontend profile panel uses these routes to read or update the logged-in
 * MongoDB User; ownership always comes from the verified JWT.
 */
const express = require("express");

const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

router.use(auth);

// GET /api/profile
// Loads the authenticated user by ObjectId, excludes the password hash, and
// returns the identity fields displayed in the header/profile form.
router.get("/", async (req, res) => {
  try {
    // req.user.id was verified and converted to ObjectId by auth middleware.
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load profile",
      error: error.message
    });
  }
});

// PUT /api/profile
// Receives name/email from the profile form, prevents email conflicts in MongoDB,
// updates only the authenticated User document, and returns the refreshed profile.
router.put("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name || !email) {
      return res.status(400).json({
        message: "Name and email are required"
      });
    }

    // Check whether another account already owns the requested email.
    const existingUser = await User.findOne({ email });
    if (existingUser && !existingUser._id.equals(req.user.id)) {
      return res.status(409).json({
        message: "Email is already registered"
      });
    }

    // Filter by the JWT-derived ObjectId so the browser cannot update another user.
    const user = await User.findOneAndUpdate(
      { _id: req.user.id },
      { name, email },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update profile",
      error: error.message
    });
  }
});

module.exports = router;
