const express = require("express");
const router = express.Router();

const Expense = require("../models/Expense");
const MonthlySummary = require("../models/MonthlySummary");

// =====================================================
// POST /expenses
// =====================================================
router.post("/", async (req, res) => {
  try {
    const { amount, category, date } = req.body;

    if (!amount || !category) {
      return res.status(400).json({
        message: "Amount and category are required"
      });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({
        message: "Amount must be a positive number"
      });
    }

    // Save expense (date-safe)
    const expense = new Expense({
      amount,
      category,
      date: date ? new Date(date) : new Date()
    });

    const savedExpense = await expense.save();

    // Determine month (YYYY-MM)
    const expenseDate = expense.date;

const month = `${expenseDate.getFullYear()}-${String(
  expenseDate.getMonth() + 1
).padStart(2, "0")}`;

    // Update monthly summary
    let monthly = await MonthlySummary.findOne({ month });

    if (monthly) {
      monthly.totalSpent += amount;
      monthly.byCategory[category] =
        (monthly.byCategory[category] || 0) + amount;

      await monthly.save();
    } else {
      await MonthlySummary.create({
        month,
        totalSpent: amount,
        byCategory: {
          [category]: amount
        }
      });
    }

    res.json({
      message: "Expense added successfully",
      expense: savedExpense
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to add expense",
      error: error.message
    });
  }
});

// =====================================================
// GET /expenses  (ALL)
// =====================================================
router.get("/", async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch expenses",
      error: error.message
    });
  }
});

// =====================================================
// GET /expenses/summary
// =====================================================
router.get("/summary", async (req, res) => {
  try {
    const expenses = await Expense.find();

    let totalSpent = 0;
    let byCategory = {};

    expenses.forEach(exp => {
      totalSpent += exp.amount;
      byCategory[exp.category] =
        (byCategory[exp.category] || 0) + exp.amount;
    });

    res.json({ totalSpent, byCategory });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate summary",
      error: error.message
    });
  }
});

// =====================================================
// GET /expenses/monthly
// =====================================================
router.get("/monthly", async (req, res) => {
  try {
    const summaries = await MonthlySummary.find().sort({ month: 1 });
    res.json(summaries);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch monthly summaries",
      error: error.message
    });
  }
});

// =====================================================
// GET /expenses/today   NEW
// =====================================================
router.get("/today", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const expenses = await Expense.find({
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch today's expenses",
      error: error.message
    });
  }
});

// =====================================================
// GET /expenses/by-date?date=YYYY-MM-DD   NEW
// =====================================================
router.get("/by-date", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "Date query is required (YYYY-MM-DD)"
      });
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const expenses = await Expense.find({
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch expenses by date",
      error: error.message
    });
  }
});

// =====================================================
// DELETE /expenses/:id  
// =====================================================
router.delete("/:id", async (req, res) => {
  try {
    // 1. Find expense first
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    const { amount, category, date } = expense;

    // 2. Determine month from expense date
    const expenseDate = new Date(date);
    const month = `${expenseDate.getFullYear()}-${String(
      expenseDate.getMonth() + 1
    ).padStart(2, "0")}`;

    // 3. Update MonthlySummary
    const monthly = await MonthlySummary.findOne({ month });

    if (monthly) {
      monthly.totalSpent -= amount;

      if (monthly.byCategory[category]) {
        monthly.byCategory[category] -= amount;

        // Remove empty categories
        if (monthly.byCategory[category] <= 0) {
          delete monthly.byCategory[category];
        }
      }

      // Safety check
      if (monthly.totalSpent < 0) {
        monthly.totalSpent = 0;
      }

      await monthly.save();
    }

    // 4. Delete expense
    await Expense.findByIdAndDelete(req.params.id);

    res.json({
      message: "Expense deleted and monthly summary updated"
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete expense",
      error: error.message
    });
  }
});
module.exports = router;