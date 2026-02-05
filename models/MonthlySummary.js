const mongoose = require("mongoose");

// Stores aggregated data for ONE month (YYYY-MM)
const monthlySummarySchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    unique: true
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  byCategory: {
    type: Map,
    of: Number,
    default: {}
  }
});

module.exports = mongoose.model(
  "MonthlySummary",
  monthlySummarySchema
);
