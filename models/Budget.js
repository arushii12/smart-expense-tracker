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

async function ensureMongoIndexes() {
  if (global.__DB_FALLBACK__) {
    return;
  }

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

  await model.collection.createIndex(
    { userId: 1, month: 1 },
    { unique: true, name: "userId_1_month_1" }
  );
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
    getBudgetModel().findOneAndDelete(normalizeUserIdFields(filter)),
  ensureMongoIndexes
};
