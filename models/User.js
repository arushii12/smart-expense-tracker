/*
 * User model for the MongoDB users collection.
 * Authentication routes create/read accounts, while profile and report routes
 * retrieve the authenticated user's identity.
 */
const mongoose = require("mongoose");

// Each document represents one account. MongoDB supplies the ObjectId _id that
// is stored as a string in JWTs and referenced by user-owned documents.
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
});

let UserModel;
// Reuses Mongoose's registered model during tests or serverless warm starts.
function getUserModel() {
  if (!UserModel) {
    UserModel = mongoose.models.User || mongoose.model("User", userSchema);
  }
  return UserModel;
}

// The wrapper keeps route code independent from direct model initialization while
// preserving normal Mongoose queries such as findById(...).select(...).
module.exports = {
  create: async data => getUserModel().create(data),
  findOne: async query => getUserModel().findOne(query),
  findOneAndUpdate: async (filter, update, options) =>
    getUserModel().findOneAndUpdate(filter, update, options),
  findById: id => getUserModel().findById(id)
};
