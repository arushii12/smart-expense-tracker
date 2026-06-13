/*
 * Expense model for the MongoDB expenses collection.
 * Expense routes create and edit records; dashboard, forecast, analytics, Paytm,
 * and report routes read the same documents for calculations and presentation.
 */
const mongoose = require("mongoose");

// Each document is one user-owned expense. userId links it to User._id, date and
// classification fields drive analytics, and optional source fields preserve
// receipt/Paytm provenance and duplicate-detection metadata.
const ExpenseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  subcategory: {
    type: String,
    default: ""
  },
  isEssential: {
    type: Boolean,
    default: true
  },
  receiptImageUrl: {
    type: String,
    default: ""
  },
  rawReceiptText: {
    type: String,
    default: ""
  },
  ocrConfidence: {
    type: Number,
    default: 0
  },
  extractedMerchant: {
    type: String,
    default: ""
  },
  extractedDate: {
    type: String,
    default: ""
  },
  source: {
    type: String,
    default: ""
  },
  notes: {
    type: String,
    default: ""
  },
  sourceStatementHash: {
    type: String,
    default: ""
  },
  sourceTransactionHashes: {
    type: [String],
    default: []
  },
  sourcePaytmTags: {
    type: [String],
    default: []
  },
  sourceTransactionDetails: {
    type: [String],
    default: []
  },
  sourceReferenceNumbers: {
    type: [String],
    default: []
  },
  date: {
    type: Date,
    default: Date.now
  }
});

let ExpenseModel;
// Lazily registers the model once, which avoids overwrite errors in reused runtimes.
function getExpenseModel() {
  if (!ExpenseModel) {
    ExpenseModel = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
  }
  return ExpenseModel;
}

// Exposes only the Mongoose operations required by routes and services.
module.exports = {
  create: async data => getExpenseModel().create(data),
  find: query => getExpenseModel().find(query),
  findOne: async query => getExpenseModel().findOne(query),
  findOneAndUpdate: async (filter, update, options) =>
    getExpenseModel().findOneAndUpdate(filter, update, options),
  findOneAndDelete: async filter => getExpenseModel().findOneAndDelete(filter)
};
