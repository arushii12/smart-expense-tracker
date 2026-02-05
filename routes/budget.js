const express = require("express");
const router = express.Router();

const Budget = require("../models/Budget");
const MonthlySummary = require("../models/MonthlySummary");

// Helper to get current month (YYYY-MM)
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// =======================================
// GET /budget/current
// =======================================
router.get("/current", async (req, res) => {
  try {
    const month = getCurrentMonth();

    const budget = await Budget.findOne({ month });
    const summary = await MonthlySummary.findOne({ month });

    res.json({
      month,
      budget: budget ? budget.amount : 0,
      spent: summary ? summary.totalSpent : 0
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch budget",
      error: error.message
    });
  }
});

// =======================================
// POST /budget
// =======================================
router.post("/", async (req, res) => {
  try {
    const { amount } = req.body;

    if (typeof amount !== "number" || amount < 0) {
      return res.status(400).json({
        message: "Budget amount must be a positive number"
      });
    }

    const month = getCurrentMonth();

    const budget = await Budget.findOneAndUpdate(
      { month },
      { amount },
      { upsert: true, new: true }
    );

    res.json({
      message: "Budget saved successfully",
      budget
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to save budget",
      error: error.message
    });
  }
});

module.exports = router;
