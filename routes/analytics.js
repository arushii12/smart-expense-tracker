/*
 * Protected analytics API.
 * The Analytics page requests a month range; this module combines MongoDB Budget,
 * Income, and Expense records into normalized monthly rows for frontend charts.
 */
const express = require("express");

const auth = require("../middleware/auth");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

const router = express.Router();

router.use(auth);

// Validates optional YYYY-MM filter values.
function isValidMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return false;
  const [, month] = String(value).split("-").map(Number);
  return month >= 1 && month <= 12;
}

// Converts expense dates into the same month key used by budgets and income.
function getMonthKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

// Creates inclusive Date boundaries for a month-based expense query.
function getMonthRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1),
    end: new Date(year, monthNumber, 0, 23, 59, 59, 999)
  };
}

// Produces the short human-readable label displayed on charts.
function getMonthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

// Advances a YYYY-MM key by one month, including year rollover.
function addMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextDate = new Date(year, monthNumber, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
}

// Builds every month between two inclusive filters so zero-activity months can
// still appear in analytics charts.
function getMonthSpan(fromMonth, toMonth) {
  const months = [];
  let cursor = fromMonth;

  while (cursor <= toMonth) {
    months.push(cursor);
    cursor = addMonth(cursor);
  }

  return months;
}

// Creates a zero-filled monthly accumulator once and returns it for later totals.
function ensureMonth(monthMap, month) {
  if (!monthMap.has(month)) {
    monthMap.set(month, {
      month,
      monthLabel: getMonthLabel(month),
      originalBudget: 0,
      additionalIncome: 0,
      availableBudget: 0,
      expenses: 0,
      savings: 0,
      needs: 0,
      wants: 0,
      wantsByCategory: {}
    });
  }

  return monthMap.get(month);
}

// Reads and validates query-string filters, writing a 400 response on invalid input.
function normalizeFilters(req, res) {
  const fromMonth = req.query.fromMonth || "";
  const toMonth = req.query.toMonth || "";

  if (fromMonth && !isValidMonth(fromMonth)) {
    res.status(400).json({ message: "Please select a valid from month." });
    return null;
  }

  if (toMonth && !isValidMonth(toMonth)) {
    res.status(400).json({ message: "Please select a valid to month." });
    return null;
  }

  if (fromMonth && toMonth && fromMonth > toMonth) {
    res.status(400).json({ message: "From month cannot be after to month." });
    return null;
  }

  return { fromMonth, toMonth };
}

// Converts optional month bounds into a MongoDB range for string month fields.
function buildMonthQuery(fromMonth, toMonth) {
  if (!fromMonth && !toMonth) return null;

  const monthQuery = {};
  if (fromMonth) monthQuery.$gte = fromMonth;
  if (toMonth) monthQuery.$lte = toMonth;
  return monthQuery;
}

// Converts month filters into Date bounds for Expense.date.
function buildExpenseDateQuery(fromMonth, toMonth) {
  if (fromMonth && toMonth) {
    return {
      $gte: getMonthRange(fromMonth).start,
      $lte: getMonthRange(toMonth).end
    };
  }

  if (fromMonth) {
    return { $gte: getMonthRange(fromMonth).start };
  }

  if (toMonth) {
    return { $lte: getMonthRange(toMonth).end };
  }

  return null;
}

// Fetches the authenticated user's three financial data sources and reduces them
// into monthly budget, income, expense, needs, wants, and savings values.
async function buildAnalytics(userId, filters) {
  const { fromMonth, toMonth } = filters;
  const budgetQuery = { userId };
  const incomeQuery = { userId };
  const expenseQuery = { userId };
  const monthQuery = buildMonthQuery(fromMonth, toMonth);
  const expenseDateQuery = buildExpenseDateQuery(fromMonth, toMonth);

  if (monthQuery) {
    budgetQuery.month = monthQuery;
    incomeQuery.month = monthQuery;
  }

  if (expenseDateQuery) {
    expenseQuery.date = expenseDateQuery;
  }

  // All queries include the verified owner before optional range filters.
  const [budgets, incomes, expenses] = await Promise.all([
    Budget.find(budgetQuery).sort({ month: 1 }),
    Income.find(incomeQuery).sort({ month: 1 }),
    Expense.find(expenseQuery).sort({ date: 1 })
  ]);

  const monthMap = new Map();

  if (fromMonth && toMonth) {
    getMonthSpan(fromMonth, toMonth).forEach(month => ensureMonth(monthMap, month));
  }

  budgets.forEach(budget => {
    const row = ensureMonth(monthMap, budget.month);
    row.originalBudget += Number(budget.amount) || 0;
  });

  incomes.forEach(income => {
    const row = ensureMonth(monthMap, income.month);
    row.additionalIncome += Number(income.amount) || 0;
  });

  expenses.forEach(expense => {
    const month = getMonthKey(expense.date);
    const row = ensureMonth(monthMap, month);
    const amount = Number(expense.amount) || 0;

    row.expenses += amount;
    // Essential expenses count as needs; explicitly non-essential expenses count
    // as wants and retain category totals for chart breakdowns.
    if (expense.isEssential === false) {
      row.wants += amount;
      const category = String(expense.category || "Uncategorized").trim() || "Uncategorized";
      row.wantsByCategory[category] = (row.wantsByCategory[category] || 0) + amount;
    } else {
      row.needs += amount;
    }
  });

  const rows = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(row => {
      // available budget = original budget + additional income
      // savings = available budget - expenses
      const availableBudget = row.originalBudget + row.additionalIncome;
      return {
        ...row,
        availableBudget,
        savings: availableBudget - row.expenses
      };
    });

  return {
    filters: {
      fromMonth: fromMonth || "",
      toMonth: toMonth || ""
    },
    rows
  };
}

// GET /api/analytics?fromMonth=YYYY-MM&toMonth=YYYY-MM
// Called by Analytics filters. Returns monthly rows that the browser can regroup
// into monthly, quarterly, or yearly visualizations.
router.get("/", async (req, res) => {
  try {
    const filters = normalizeFilters(req, res);
    if (!filters) return;

    const analytics = await buildAnalytics(req.user.id, filters);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch analytics",
      error: error.message
    });
  }
});

module.exports = router;
