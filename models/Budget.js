const mongoose = require("mongoose");
const fallbackDb = require("../fallbackDb");

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
    ref: "User",
    required: true
  },
  month: {
    type: String, // YYYY-MM
    required: true
  },
  amount: {
    type: Number,
    required: true
  }
});

budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

let BudgetModel;
function getBudgetModel() {
  if (global.__DB_FALLBACK__) {
    return fallbackDb.collection("budgets");
  }
  if (!BudgetModel) {
    BudgetModel = mongoose.models.Budget || mongoose.model("Budget", budgetSchema);
  }
  return BudgetModel;
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
  find: query => getBudgetModel().find(normalizeUserIdFields(query)),
  findOne: async query => getBudgetModel().findOne(normalizeUserIdFields(query)),
  findOneAndUpdate: async (filter, update, options) =>
    getBudgetModel().findOneAndUpdate(
      normalizeUserIdFields(filter),
      normalizeUserIdFields(update),
      options
    ),
  findOneAndDelete: async filter =>
    getBudgetModel().findOneAndDelete(normalizeUserIdFields(filter))
};
