const express = require("express");
const router = express.Router();

const Expense = require("../models/Expense");
const auth = require("../middleware/auth");

router.use(auth);

// =====================================================
// POST /expenses
// =====================================================
router.post("/", async (req, res) => {
  try {
    const { amount, category, subcategory, isEssential, date } = req.body;

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
    const savedExpense = await Expense.create({
      userId: req.user.id,
      amount,
      category,
      subcategory: sanitizeOptionalText(subcategory),
      isEssential: isEssential !== false,
      date: date ? new Date(date) : new Date()
    });

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
    const expenses = await Expense.find({ userId: req.user.id }).sort({
      date: -1
    });
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
    const expenses = await Expense.find({ userId: req.user.id });

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
    const expenses = await Expense.find({ userId: req.user.id }).sort({
      date: 1
    });
    const summariesByMonth = {};

    expenses.forEach(exp => {
      const expenseDate = new Date(exp.date);
      const month = `${expenseDate.getFullYear()}-${String(
        expenseDate.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!summariesByMonth[month]) {
        summariesByMonth[month] = {
          month,
          totalSpent: 0,
          byCategory: {}
        };
      }

      summariesByMonth[month].totalSpent += exp.amount;
      summariesByMonth[month].byCategory[exp.category] =
        (summariesByMonth[month].byCategory[exp.category] || 0) + exp.amount;
    });

    const summaries = Object.values(summariesByMonth);
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
      userId: req.user.id,
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
      userId: req.user.id,
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
// GET /expenses/range?from=YYYY-MM-DD&to=YYYY-MM-DD
// =====================================================
router.get("/range", async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        message: "From and to dates are required (YYYY-MM-DD)"
      });
    }

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Please provide valid from and to dates"
      });
    }

    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch expenses by range",
      error: error.message
    });
  }
});

// =====================================================
// PUT /expenses/:id
// =====================================================
router.put("/:id", async (req, res) => {
  try {
    const { amount, category, subcategory, isEssential, date } = req.body;

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

    const expense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id
      },
      {
        amount,
        category,
        subcategory: sanitizeOptionalText(subcategory),
        isEssential: isEssential !== false,
        date: date ? new Date(date) : new Date()
      },
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    res.json({
      message: "Expense updated successfully",
      expense
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update expense",
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
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    res.json({
      message: "Expense deleted successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Failed to delete expense",
      error: error.message
    });
  }
});
module.exports = router;

function sanitizeOptionalText(value) {
  return typeof value === "string" ? value.trim() : "";
}
