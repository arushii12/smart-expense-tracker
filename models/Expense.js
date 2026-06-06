const mongoose = require("mongoose");
const fallbackDb = require("../fallbackDb");

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
function getExpenseModel() {
  if (global.__DB_FALLBACK__) {
    return fallbackDb.collection("expenses");
  }
  if (!ExpenseModel) {
    ExpenseModel = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
  }
  return ExpenseModel;
}

module.exports = {
  create: async data => getExpenseModel().create(data),
  find: query => getExpenseModel().find(query),
  findOne: async query => getExpenseModel().findOne(query),
  findOneAndUpdate: async (filter, update, options) =>
    getExpenseModel().findOneAndUpdate(filter, update, options),
  findOneAndDelete: async filter => getExpenseModel().findOneAndDelete(filter)
};
