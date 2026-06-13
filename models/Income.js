/*
 * Income model for additional monthly income stored in MongoDB.
 * Income routes manage manual entries, while Paytm imports may create received
 * payments; budget, forecast, analytics, statements, and reports sum them.
 */
const mongoose = require("mongoose");

// Each document belongs to one User ObjectId. month supports efficient monthly
// totals, date supports history, and source fields trace Paytm imports.
const incomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  month: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  remarks: {
    type: String,
    default: ""
  },
  source: {
    type: String,
    default: ""
  },
  sourceStatementHash: {
    type: String,
    default: ""
  },
  sourceTransactionHash: {
    type: String,
    default: ""
  },
  sourcePaytmTag: {
    type: String,
    default: ""
  },
  sourceTransactionDetails: {
    type: String,
    default: ""
  },
  sourceReferenceNumber: {
    type: String,
    default: ""
  }
}, {
  timestamps: true
});

let IncomeModel;

// Lazily registers and reuses the Mongoose model.
function getIncomeModel() {
  if (!IncomeModel) {
    IncomeModel = mongoose.models.Income || mongoose.model("Income", incomeSchema);
  }
  return IncomeModel;
}

// Provides the CRUD operations required by income and calculation routes.
module.exports = {
  create: data => getIncomeModel().create(data),
  find: query => getIncomeModel().find(query),
  findOne: query => getIncomeModel().findOne(query),
  findOneAndUpdate: (filter, update, options) =>
    getIncomeModel().findOneAndUpdate(filter, update, options),
  findOneAndDelete: filter =>
    getIncomeModel().findOneAndDelete(filter)
};
