/*
 * Budget model for monthly base allocations in MongoDB.
 * Budget, forecast, analytics, insight, statement, and report routes combine
 * these records with Income and Expense data for one authenticated user.
 */
const mongoose = require("mongoose");

// One document stores one user's base budget for one YYYY-MM month.
// Additional income remains in the Income collection and is added during reads.
const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
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

// Prevents duplicate monthly budgets for the same user while allowing different
// users to save a budget for the same month.
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

let BudgetModel;
// Reuses an existing registration in tests and serverless warm processes.
function getBudgetModel() {
  if (!BudgetModel) {
    BudgetModel = mongoose.models.Budget || mongoose.model("Budget", budgetSchema);
  }
  return BudgetModel;
}

// Removes an obsolete month-only index, then enforces ownership-aware uniqueness.
// Called during database startup before requests are accepted.
async function ensureMongoIndexes() {
  const model = getBudgetModel();

  try {
    await model.collection.dropIndex("month_1");
    console.log("Dropped stale budgets.month_1 unique index.");
  } catch (error) {
    const indexMissing =
      error.code === 26 ||
      error.code === 27 ||
      error.codeName === "NamespaceNotFound" ||
      error.codeName === "IndexNotFound";

    if (!indexMissing) {
      throw error;
    }
  }

  // Create the intended compound index directly in MongoDB.
  await model.collection.createIndex(
    { userId: 1, month: 1 },
    { unique: true, name: "userId_1_month_1" }
  );
}

// Model wrapper used by route modules for user-scoped queries and updates.
module.exports = {
  find: query => getBudgetModel().find(query),
  findOne: async query => getBudgetModel().findOne(query),
  findOneAndUpdate: async (filter, update, options) =>
    getBudgetModel().findOneAndUpdate(filter, update, options),
  findOneAndDelete: async filter =>
    getBudgetModel().findOneAndDelete(filter),
  ensureMongoIndexes
};
