/*
 * Protected monthly budget routes.
 * The Budget page uses this API to save base allocations and combine them with
 * additional Income and monthly Expense records for user-specific totals.
 */
const express = require("express");
const router = express.Router();

const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const auth = require("../middleware/auth");

router.use(auth);

// Helper to get current month (YYYY-MM)
// Returns the current local month in the YYYY-MM format used throughout the API.
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Falls back to the current month when an optional value is invalid.
function normalizeMonth(value) {
  return isValidMonth(value) ? value : getCurrentMonth();
}

// Validates the month key before it is used in MongoDB filters.
function isValidMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return false;
  const [, month] = String(value).split("-").map(Number);
  return month >= 1 && month <= 12;
}

// Produces inclusive Date boundaries for expense queries in one month.
function getMonthRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1),
    end: new Date(year, monthNumber, 0, 23, 59, 59, 999)
  };
}

// Fetches the user's income documents and reduces them into month-to-total values.
// Monthly budget history uses this helper to add income without mutating budgets.
async function getIncomeTotalsByMonth(userId, monthQuery = {}) {
  const query = { userId };
  if (monthQuery && Object.keys(monthQuery).length) {
    query.month = monthQuery;
  }

  // The authenticated userId is always included in the MongoDB query.
  const incomes = await Income.find(query);
  return incomes.reduce((totals, income) => {
    totals[income.month] = (totals[income.month] || 0) + Number(income.amount || 0);
    return totals;
  }, {});
}

// Safely extracts the original base allocation from an optional Budget document.
function getBaseBudgetAmount(budget) {
  return budget ? Number(budget.amount) || 0 : 0;
}

// =======================================
// GET /budget/current
// =======================================
// Called when the Budget page or dashboard loads a month. It returns:
// available budget = base budget + additional income, plus spending for the month.
router.get("/current", async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();
    if (!isValidMonth(month)) {
      return res.status(400).json({
        message: "Please select a valid month for this budget"
      });
    }

    const { start, end } = getMonthRange(month);

    // These three MongoDB reads share the same authenticated owner and month.
    const budget = await Budget.findOne({
      userId: req.user.id,
      month
    });
    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: start, $lte: end }
    });
    const incomes = await Income.find({
      userId: req.user.id,
      month
    });
    const spent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const additionalIncome = incomes.reduce((sum, income) => sum + Number(income.amount), 0);
    const baseBudget = getBaseBudgetAmount(budget);
    const availableBudget = baseBudget + additionalIncome;

    res.json({
      month,
      budget: availableBudget,
      baseBudget,
      additionalIncome,
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
// Called by budget history and trend charts. It returns every saved monthly base
// budget and optionally merges income-only months into the response.
router.get("/monthly", async (req, res) => {
  try {
    const includeIncome = req.query.includeIncome === "true";
    // Fetch only budgets owned by the JWT user.
    const budgets = await Budget.find({ userId: req.user.id }).sort({
      month: 1
    });
    const incomeTotalsByMonth = await getIncomeTotalsByMonth(req.user.id);
    const monthKeys = new Set(budgets.map(budget => budget.month));

    if (includeIncome) {
      Object.keys(incomeTotalsByMonth).forEach(month => monthKeys.add(month));
    }

    const budgetByMonth = Object.fromEntries(budgets.map(budget => [budget.month, budget]));
    const response = [];

    for (const month of Array.from(monthKeys).sort()) {
      const budget = budgetByMonth[month] || null;
      const additionalIncome = incomeTotalsByMonth[month] || 0;
      const baseBudget = getBaseBudgetAmount(budget);
      response.push({
        month,
        amount: includeIncome ? baseBudget + additionalIncome : baseBudget,
        baseBudget,
        additionalIncome
      });
    }

    res.json(response);
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
// Called by Save Allocation with { month, amount }. The compound user/month
// filter upserts one MongoDB Budget per user/month and returns the saved document.
router.post("/", async (req, res) => {
  try {
    console.log("Budget save request:", {
      body: req.body,
      userId: req.user && req.user.id
    });

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

    // Upsert updates an existing allocation or creates it when missing.
    // userId comes from auth middleware, not from the request body.
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
    console.error("Budget save failed:", error);
    console.error("Budget save context:", {
      body: req.body,
      userId: req.user && req.user.id
    });

    res.status(500).json({
      message: "Failed to save budget",
      error: error.message
    });
  }
});

// =======================================
// DELETE /budget/:month
// =======================================
// Called by Delete in budget history. It deletes the authenticated user's base
// budget and that month's additional-income records, then returns the removed count.
router.delete("/:month", async (req, res) => {
  try {
    const { month } = req.params;

    if (!isValidMonth(month)) {
      return res.status(400).json({
        message: "Please select a valid month for this budget"
      });
    }

    // The owner/month pair prevents deletion of another user's allocation.
    const deletedBudget = await Budget.findOneAndDelete({
      userId: req.user.id,
      month
    });

    if (!deletedBudget) {
      return res.status(404).json({
        message: "Budget not found"
      });
    }

    // Income is stored separately, so associated entries are found and removed
    // explicitly when the entire monthly allocation is deleted.
    const incomes = await Income.find({
      userId: req.user.id,
      month
    });
    await Promise.all(
      incomes.map(income =>
        Income.findOneAndDelete({
          _id: income._id,
          userId: req.user.id
        })
      )
    );

    res.json({
      message: "Budget deleted successfully",
      month,
      deletedIncomeCount: incomes.length
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete budget",
      error: error.message
    });
  }
});

module.exports = router;
