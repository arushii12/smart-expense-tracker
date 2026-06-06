const mongoose = require("mongoose");
const fallbackDb = require("../fallbackDb");

const ignoredSubcategorySuggestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
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

function getIgnoredSubcategorySuggestionModel() {
  if (global.__DB_FALLBACK__) {
    return fallbackDb.collection("ignoredSubcategorySuggestions");
  }

  if (!IgnoredSubcategorySuggestionModel) {
    IgnoredSubcategorySuggestionModel =
      mongoose.models.IgnoredSubcategorySuggestion ||
      mongoose.model("IgnoredSubcategorySuggestion", ignoredSubcategorySuggestionSchema);
  }

  return IgnoredSubcategorySuggestionModel;
}

function normalizeUserId(value) {
  if (global.__DB_FALLBACK__) {
    return value;
  }

  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  return value;
}

function normalizeUserIdFields(data) {
  if (!data || data.userId === undefined) {
    return data;
  }

  return {
    ...data,
    userId: normalizeUserId(data.userId)
  };
}

module.exports = {
  create: data => getIgnoredSubcategorySuggestionModel().create(normalizeUserIdFields(data)),
  find: query => getIgnoredSubcategorySuggestionModel().find(normalizeUserIdFields(query)),
  findOne: query => getIgnoredSubcategorySuggestionModel().findOne(normalizeUserIdFields(query)),
  findOneAndDelete: filter =>
    getIgnoredSubcategorySuggestionModel().findOneAndDelete(normalizeUserIdFields(filter))
};
