const express = require("express");
const router = express.Router();

const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const auth = require("../middleware/auth");

router.use(auth);

// Helper to get current month (YYYY-MM)
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeMonth(value) {
  return isValidMonth(value) ? value : getCurrentMonth();
}

function isValidMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return false;
  const [, month] = String(value).split("-").map(Number);
  return month >= 1 && month <= 12;
}

function getMonthRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1),
    end: new Date(year, monthNumber, 0, 23, 59, 59, 999)
  };
}

// =======================================
// GET /budget/current
// =======================================
router.get("/current", async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();
    if (!isValidMonth(month)) {
      return res.status(400).json({
        message: "Please select a valid month for this budget"
      });
    }

    const { start, end } = getMonthRange(month);

    const budget = await Budget.findOne({
      userId: req.user.id,
      month
    });
    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: start, $lte: end }
    });
    const spent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    res.json({
      month,
      budget: budget ? budget.amount : 0,
      spent
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch budget",
      error: error.message
    });
  }
});

// =======================================
// GET /budget/monthly
// =======================================
router.get("/monthly", async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.id }).sort({
      month: 1
    });

    res.json(budgets.map(budget => ({
      month: budget.month,
      amount: budget.amount
    })));
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch monthly budgets",
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
    const month = req.body.month;

    if (typeof amount !== "number" || amount < 0) {
      return res.status(400).json({
        message: "Budget amount must be a positive number"
      });
    }

    if (!isValidMonth(month)) {
      return res.status(400).json({
        message: "Please select a valid month for this budget"
      });
    }

    const budget = await Budget.findOneAndUpdate(
      {
        userId: req.user.id,
        month
      },
      {
        userId: req.user.id,
        month,
        amount
      },
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
