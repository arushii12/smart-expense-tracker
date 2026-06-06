const express = require("express");

const auth = require("../middleware/auth");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const Income = require("../models/Income");

const router = express.Router();

router.use(auth);

function isValidMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return false;
  const [, month] = String(value).split("-").map(Number);
  return month >= 1 && month <= 12;
}

function getMonthKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1),
    end: new Date(year, monthNumber, 0, 23, 59, 59, 999)
  };
}

function getMonthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

function addMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextDate = new Date(year, monthNumber, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthSpan(fromMonth, toMonth) {
  const months = [];
  let cursor = fromMonth;

  while (cursor <= toMonth) {
    months.push(cursor);
    cursor = addMonth(cursor);
  }

  return months;
}

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

function buildMonthQuery(fromMonth, toMonth) {
  if (!fromMonth && !toMonth) return null;

  const monthQuery = {};
  if (fromMonth) monthQuery.$gte = fromMonth;
  if (toMonth) monthQuery.$lte = toMonth;
  return monthQuery;
}

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
