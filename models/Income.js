const mongoose = require("mongoose");
const fallbackDb = require("../fallbackDb");

const incomeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed,
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

function getIncomeModel() {
  if (global.__DB_FALLBACK__) {
    return fallbackDb.collection("incomes");
  }
  if (!IncomeModel) {
    IncomeModel = mongoose.models.Income || mongoose.model("Income", incomeSchema);
  }
  return IncomeModel;
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
  create: data => getIncomeModel().create(normalizeUserIdFields(data)),
  find: query => getIncomeModel().find(normalizeUserIdFields(query)),
  findOne: query => getIncomeModel().findOne(normalizeUserIdFields(query)),
  findOneAndUpdate: (filter, update, options) =>
    getIncomeModel().findOneAndUpdate(
      normalizeUserIdFields(filter),
      update,
      options
    ),
  findOneAndDelete: filter =>
    getIncomeModel().findOneAndDelete(normalizeUserIdFields(filter))
};
