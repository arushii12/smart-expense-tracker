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

// =======================================
// GET /budget/current
// =======================================
router.get("/current", async (req, res) => {
  try {
    const month = getCurrentMonth();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const budget = await Budget.findOne({
      userId: req.user.id,
      month
    });
    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
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
      {
        userId: req.user.id,
        month
      },
      {
        userId: req.user.id,
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
