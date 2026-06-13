/*
 * Model for subcategory suggestions a user has dismissed.
 * Expense routes consult this MongoDB collection when building personalized
 * autocomplete suggestions and remove a dismissal when that value is used again.
 */
const mongoose = require("mongoose");

// Normalized key fields make case-insensitive preference matching predictable;
// userId ensures one user's dismissals never affect another user.
const ignoredSubcategorySuggestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  category: {
    type: String,
    required: true
  },
  categoryKey: {
    type: String,
    required: true
  },
  subcategory: {
    type: String,
    required: true
  },
  subcategoryKey: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

let IgnoredSubcategorySuggestionModel;

// Reuses the registered model in long-lived and serverless runtimes.
function getIgnoredSubcategorySuggestionModel() {
  if (!IgnoredSubcategorySuggestionModel) {
    IgnoredSubcategorySuggestionModel =
      mongoose.models.IgnoredSubcategorySuggestion ||
      mongoose.model("IgnoredSubcategorySuggestion", ignoredSubcategorySuggestionSchema);
  }

  return IgnoredSubcategorySuggestionModel;
}

// Small query wrapper used by the expense suggestion endpoints.
module.exports = {
  create: data => getIgnoredSubcategorySuggestionModel().create(data),
  find: query => getIgnoredSubcategorySuggestionModel().find(query),
  findOne: query => getIgnoredSubcategorySuggestionModel().findOne(query),
  findOneAndDelete: filter =>
    getIgnoredSubcategorySuggestionModel().findOneAndDelete(filter)
};
