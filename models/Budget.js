const mongoose = require("mongoose");
const fallbackDb = require("../fallbackDb");

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

module.exports = {
  find: query => getBudgetModel().find(query),
  findOne: async query => getBudgetModel().findOne(query),
  findOneAndUpdate: async (filter, update, options) =>
    getBudgetModel().findOneAndUpdate(filter, update, options)
};
