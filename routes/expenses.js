/*
 * Main protected expense and insight API.
 * The frontend uses it for expense CRUD/history, subcategory preferences, monthly
 * summaries, and smart insights derived from user-owned MongoDB records.
 */
const express = require("express");
const router = express.Router();

const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const IgnoredSubcategorySuggestion = require("../models/IgnoredSubcategorySuggestion");
const Income = require("../models/Income");
const auth = require("../middleware/auth");

router.use(auth);

// Reads the user's base Budget and Income for one month.
// Available money = base budget + summed additional income.
async function getAvailableBudget(userId, month) {
  // Fetch the base allocation and all additional-income documents for this owner/month.
  const [budgetDoc, incomes] = await Promise.all([
    Budget.findOne({ userId, month }),
    Income.find({ userId, month })
  ]);
  const additionalIncome = incomes.reduce((sum, income) => sum + Number(income.amount || 0), 0);
  const baseBudget = budgetDoc ? Number(budgetDoc.amount) || 0 : 0;

  return baseBudget + additionalIncome;
}

// Normalizes suggestion values for case-insensitive preference keys.
function getSuggestionKey(value) {
  return sanitizeOptionalText(value).toLowerCase();
}

// Builds the user/category/subcategory ownership filter for dismissal records.
function getIgnoredSuggestionFilter(userId, category, subcategory) {
  return {
    userId,
    categoryKey: getSuggestionKey(category),
    subcategoryKey: getSuggestionKey(subcategory)
  };
}

// Removes a previous dismissal when the user deliberately saves that subcategory.
async function restoreSubcategorySuggestion(userId, category, subcategory) {
  const cleanCategory = sanitizeOptionalText(category);
  const cleanSubcategory = sanitizeOptionalText(subcategory);

  if (!cleanCategory || !cleanSubcategory) return;

  // Delete only this user's matching dismissal preference.
  await IgnoredSubcategorySuggestion.findOneAndDelete(
    getIgnoredSuggestionFilter(userId, cleanCategory, cleanSubcategory)
  );
}

// =====================================================
// POST /expenses
// =====================================================
// POST /expenses
// Add Expense and receipt-save flows send expense fields here. The route attaches
// JWT ownership, writes MongoDB, and returns the created document.
router.post("/", async (req, res) => {
  try {
    const {
      amount,
      category,
      subcategory,
      isEssential,
      receiptImageUrl,
      rawReceiptText,
      ocrConfidence,
      extractedMerchant,
      extractedDate,
      date
    } = req.body;

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
    // The saved owner always comes from auth middleware; a body userId is ignored.
    const savedExpense = await Expense.create({
      userId: req.user.id,
      amount,
      category,
      subcategory: sanitizeOptionalText(subcategory),
      isEssential: isEssential !== false,
      receiptImageUrl: sanitizeOptionalText(receiptImageUrl),
      rawReceiptText: sanitizeOptionalText(rawReceiptText),
      ocrConfidence: normalizeConfidence(ocrConfidence),
      extractedMerchant: sanitizeOptionalText(extractedMerchant),
      extractedDate: sanitizeOptionalText(extractedDate),
      date: date ? new Date(date) : new Date()
    });

    await restoreSubcategorySuggestion(req.user.id, savedExpense.category, savedExpense.subcategory);

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
// GET /expenses
// Returns every expense belonging to the logged-in user in newest-first order.
router.get("/", async (req, res) => {
  try {
    // Find all Expense documents whose owner matches the verified JWT user.
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
// GET /expenses/subcategories
// =====================================================
// GET /expenses/subcategories
// Builds personalized form suggestions from recent expenses and dismissal records.
router.get("/subcategories", async (req, res) => {
  try {
    // Expense history supplies candidate values; dismissal documents remove choices
    // that this user previously hid.
    const expenses = await Expense.find({ userId: req.user.id }).sort({
      date: -1,
      updatedAt: -1,
      createdAt: -1
    });
    const ignoredSuggestions = await IgnoredSubcategorySuggestion.find({ userId: req.user.id });
    const ignoredKeys = new Set(
      ignoredSuggestions.map(item => `${item.categoryKey}|${item.subcategoryKey}`)
    );
    const suggestions = {};
    const seen = {};

    expenses.forEach(expense => {
      const category = sanitizeOptionalText(expense.category);
      const subcategory = sanitizeOptionalText(expense.subcategory);

      if (!category || !subcategory) return;

      if (!suggestions[category]) {
        suggestions[category] = [];
        seen[category] = new Set();
      }

      const normalized = subcategory.toLowerCase();
      if (ignoredKeys.has(`${category.toLowerCase()}|${normalized}`)) return;
      if (seen[category].has(normalized)) return;
      if (suggestions[category].length >= 5) return;

      seen[category].add(normalized);
      suggestions[category].push(subcategory);
    });

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch subcategory suggestions",
      error: error.message
    });
  }
});

// =====================================================
// POST /expenses/subcategories/ignore
// =====================================================
// POST /expenses/subcategories/ignore
// Stores a normalized, user-owned preference when autocomplete is dismissed.
router.post("/subcategories/ignore", async (req, res) => {
  try {
    const category = sanitizeOptionalText(req.body.category);
    const subcategory = sanitizeOptionalText(req.body.subcategory);

    if (!category || !subcategory) {
      return res.status(400).json({
        message: "Category and subcategory are required"
      });
    }

    const filter = getIgnoredSuggestionFilter(req.user.id, category, subcategory);
    // Check MongoDB before creating the preference to avoid duplicate dismissals.
    const existing = await IgnoredSubcategorySuggestion.findOne(filter);

    if (!existing) {
      await IgnoredSubcategorySuggestion.create({
        userId: req.user.id,
        category,
        categoryKey: filter.categoryKey,
        subcategory,
        subcategoryKey: filter.subcategoryKey
      });
    }

    res.json({
      message: "Subcategory suggestion removed",
      category,
      subcategory
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to remove subcategory suggestion",
      error: error.message
    });
  }
});

// =====================================================
// GET /expenses/summary
// =====================================================
// GET /expenses/summary
// Returns all-time spending and category totals for the authenticated user.
router.get("/summary", async (req, res) => {
  try {
    // This all-time summary still includes an ownership filter.
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
// GET /expenses/monthly
// Groups this user's expenses into monthly totals and category breakdowns for charts.
router.get("/monthly", async (req, res) => {
  try {
    // Read user-owned records chronologically before grouping them in memory.
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
// GET /expenses/insights?month=YYYY-MM
// =====================================================
// GET /expenses/insights?month=YYYY-MM
// Compares current/prior expenses with available budget and returns prepared
// messages plus alert flags for the Insights and Dashboard views.
router.get("/insights", async (req, res) => {
  try {
    const month = req.query.month || getCurrentMonth();

    if (!isValidMonth(month)) {
      return res.status(400).json({
        message: "Please select a valid insight month"
      });
    }

    const { start, end } = getMonthRange(month);
    const previousMonth = getPreviousMonth(month);
    const previousRange = getMonthRange(previousMonth);

    const [currentExpenses, previousExpenses, budgetAmount] = await Promise.all([
      // Both periods use the same authenticated owner and different date ranges.
      Expense.find({
        userId: req.user.id,
        date: { $gte: start, $lte: end }
      }),
      Expense.find({
        userId: req.user.id,
        date: { $gte: previousRange.start, $lte: previousRange.end }
      }),
      getAvailableBudget(req.user.id, month)
    ]);

    const currentTotal = sumExpenses(currentExpenses);
    const previousTotal = sumExpenses(previousExpenses);

    res.json({
      month,
      totalSpent: currentTotal,
      previousMonth,
      previousTotal,
      budget: budgetAmount,
      topCategoryInsight: buildTopCategoryInsight(currentExpenses, currentTotal, month),
      monthlyTrendInsight: buildMonthlyTrendInsight(currentTotal, previousTotal, previousMonth),
      budgetWarningInsight: buildBudgetWarningInsight(currentTotal, budgetAmount, month),
      isBudgetForecastOverrun: budgetAmount > 0 && getProjectedMonthEndSpending(currentTotal, month) > budgetAmount,
      isOverspending: currentTotal > budgetAmount && budgetAmount > 0,
      overspendingAlert: buildOverspendingAlert(currentTotal, budgetAmount, month),
      hasCategoryOverspendingAlert: hasCategoryOverspendingAlert(currentExpenses, budgetAmount),
      categoryOverspendingAlert: buildCategoryOverspendingAlert(currentExpenses, budgetAmount, month),
      savingsInsight: buildSavingsInsight(currentExpenses, month),
      forecastedMonthEndSavingsInsight: buildForecastedMonthEndSavingsInsight(currentTotal, budgetAmount, month),
      spendingEfficiencyInsight: buildSpendingEfficiencyInsight(currentExpenses, currentTotal, month),
      patternInsight: buildPatternInsight(currentExpenses, month)
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to generate insights",
      error: error.message
    });
  }
});

// =====================================================
// GET /expenses/today   NEW
// =====================================================
// GET /expenses/today
// Returns today's user-owned records for the history shortcut.
router.get("/today", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // Query the authenticated user's records between local day boundaries.
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
// GET /expenses/by-date?date=YYYY-MM-DD
// Returns one day's user-owned expenses for date filtering.
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

    // MongoDB combines the requested day with JWT ownership.
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
// GET /expenses/range?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns authenticated-user expenses inside inclusive date boundaries.
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

    // MongoDB combines inclusive date limits with the authenticated owner.
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
// PUT /expenses/:id
// Validates edited fields, updates only the matching user-owned document, and
// returns the updated Expense to the frontend.
router.put("/:id", async (req, res) => {
  try {
    const {
      amount,
      category,
      subcategory,
      isEssential,
      receiptImageUrl,
      rawReceiptText,
      ocrConfidence,
      extractedMerchant,
      extractedDate,
      date
    } = req.body;

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

    const updateFields = {
      amount,
      category,
      subcategory: sanitizeOptionalText(subcategory),
      isEssential: isEssential !== false,
      date: date ? new Date(date) : new Date()
    };

    if (receiptImageUrl !== undefined) {
      updateFields.receiptImageUrl = sanitizeOptionalText(receiptImageUrl);
    }
    if (rawReceiptText !== undefined) {
      updateFields.rawReceiptText = sanitizeOptionalText(rawReceiptText);
    }
    if (ocrConfidence !== undefined) {
      updateFields.ocrConfidence = normalizeConfidence(ocrConfidence);
    }
    if (extractedMerchant !== undefined) {
      updateFields.extractedMerchant = sanitizeOptionalText(extractedMerchant);
    }
    if (extractedDate !== undefined) {
      updateFields.extractedDate = sanitizeOptionalText(extractedDate);
    }

    // Matching both _id and userId is the authorization check for the update.
    const expense = await Expense.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id
      },
      updateFields,
      { new: true }
    );

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    await restoreSubcategorySuggestion(req.user.id, expense.category, expense.subcategory);

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
// DELETE /expenses/:id
// Verifies ownership, removes the MongoDB document, and confirms deletion.
router.delete("/:id", async (req, res) => {
  try {
    // 1. Find expense first
    // The lookup includes ownership so an inaccessible record behaves as not found.
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!expense) {
      return res.status(404).json({
        message: "Expense not found"
      });
    }

    // Delete the same verified user-owned document.
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

// Trims optional text fields before storage.
function sanitizeOptionalText(value) {
  return typeof value === "string" ? value.trim() : "";
}

// Converts OCR confidence to a safe percentage between 0 and 100.
function normalizeConfidence(value) {
  const confidence = Number(value);
  if (Number.isNaN(confidence) || confidence < 0) return 0;
  return Math.min(confidence, 100);
}

// Returns the current local YYYY-MM month.
function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// Validates month filters used by insight calculations.
function isValidMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return false;
  const [, month] = String(value).split("-").map(Number);
  return month >= 1 && month <= 12;
}

// Builds inclusive Date boundaries for one month.
function getMonthRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1),
    end: new Date(year, monthNumber, 0, 23, 59, 59, 999)
  };
}

// Calculates the month immediately before the selected month.
function getPreviousMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const previousDate = new Date(year, monthNumber - 2, 1);
  return `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, "0")}`;
}

// Converts YYYY-MM to a readable label.
function formatMonthLabel(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
  });
}

// Formats rounded rupee values inside insight text.
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Math.round(Number(amount) || 0));
}

// Sums numeric expense amounts.
function sumExpenses(expenses) {
  return expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
}

// Reduces expenses into category-to-total values.
function getCategoryTotals(expenses) {
  return expenses.reduce((totals, exp) => {
    totals[exp.category] = (totals[exp.category] || 0) + Number(exp.amount || 0);
    return totals;
  }, {});
}

// Explains which category has the largest share of current spending.
function buildTopCategoryInsight(currentExpenses, currentTotal, month) {
  if (!currentExpenses.length || currentTotal === 0) {
    return `No spending data for ${formatMonthLabel(month)} yet.`;
  }

  const totals = getCategoryTotals(currentExpenses);
  const [category, amount] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  const percent = Math.round((amount / currentTotal) * 100);
  return `${category} accounts for ${percent}% of your spending in ${formatMonthLabel(month)}.`;
}

// Reports month-over-month percentage change.
function buildMonthlyTrendInsight(currentTotal, previousTotal, previousMonth) {
  if (previousTotal === 0 && currentTotal === 0) {
    return "No monthly spending trend is available for this selection yet.";
  }

  if (previousTotal === 0) {
    return `No ${formatMonthLabel(previousMonth)} spending is available to compare.`;
  }

  const percent = Math.round(((currentTotal - previousTotal) / previousTotal) * 100);

  if (percent > 0) {
    return `Spending increased by ${percent}% compared to ${formatMonthLabel(previousMonth)}.`;
  }

  if (percent < 0) {
    return `Spending decreased by ${Math.abs(percent)}% compared to ${formatMonthLabel(previousMonth)}.`;
  }

  return `Spending is unchanged compared to ${formatMonthLabel(previousMonth)}.`;
}

// Compares projected month-end spending with available budget.
function buildBudgetWarningInsight(currentTotal, budget, month) {
  if (!budget) {
    return `Set a budget for ${formatMonthLabel(month)} to unlock budget warnings.`;
  }

  const forecast = getProjectedMonthEndSpending(currentTotal, month);
  const projectedDifference = forecast - budget;

  if (projectedDifference > 0) {
    return `At this pace, ${formatMonthLabel(month)} may exceed budget by ${formatCurrency(projectedDifference)}.`;
  }

  return `At this pace, ${formatMonthLabel(month)} may stay ${formatCurrency(Math.abs(projectedDifference))} under budget.`;
}

// Reports actual spending above budget, including amount and percentage.
function buildOverspendingAlert(currentTotal, budget, month) {
  if (!budget) {
    return `Set a budget for ${formatMonthLabel(month)} to track overspending.`;
  }

  if (currentTotal <= budget) {
    return `No overspending during this month. Spending is within the ${formatMonthLabel(month)} budget.`;
  }

  const overspendingAmount = currentTotal - budget;
  const overspendingPercent = Math.round((overspendingAmount / budget) * 100);
  return `You exceeded your budget by ${formatCurrency(overspendingAmount)} (${overspendingPercent}%) in ${formatMonthLabel(month)}.`;
}

// Projection = spending / max(days observed, 7) * days in month.
function getProjectedMonthEndSpending(currentTotal, month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const totalDays = new Date(year, monthNumber, 0).getDate();
  const now = new Date();
  const isCurrentMonth = month === getCurrentMonth();
  const daysPassed = isCurrentMonth ? now.getDate() : totalDays;
  const averageWindowDays = Math.max(daysPassed, 7);
  return Math.round((currentTotal / averageWindowDays) * totalDays);
}

// Flags when one category exceeds half of available budget.
function hasCategoryOverspendingAlert(currentExpenses, budget) {
  if (!budget || !currentExpenses.length) return false;
  const threshold = budget * 0.5;
  return Object.values(getCategoryTotals(currentExpenses)).some(amount => amount > threshold);
}

// Describes the largest category crossing the 50% threshold.
function buildCategoryOverspendingAlert(currentExpenses, budget, month) {
  if (!budget) {
    return `Set a budget for ${formatMonthLabel(month)} to enable category overspending alerts.`;
  }

  if (!currentExpenses.length) {
    return `No category spending alert for ${formatMonthLabel(month)} yet.`;
  }

  const threshold = budget * 0.5;
  const totals = getCategoryTotals(currentExpenses);
  const overspentCategories = Object.entries(totals)
    .filter(([, amount]) => amount > threshold)
    .sort((a, b) => b[1] - a[1]);

  if (!overspentCategories.length) {
    return `No category has exceeded 50% of the ${formatMonthLabel(month)} budget.`;
  }

  const [category, amount] = overspentCategories[0];
  const percent = Math.round((amount / budget) * 100);
  return `Category Overspending Alert: ${category} is at ${percent}% of monthly budget (${formatCurrency(amount)} of ${formatCurrency(budget)}).`;
}

// Estimates savings from skipping one average purchase in the top category.
function buildSavingsInsight(currentExpenses, month) {
  if (!currentExpenses.length) {
    return `Add expenses for ${formatMonthLabel(month)} to see savings recommendations.`;
  }

  const totals = getCategoryTotals(currentExpenses);
  const [category, amount] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  const categoryExpenses = currentExpenses.filter(exp => exp.category === category);
  const averageSpend = Math.round(amount / categoryExpenses.length);

  return `Skipping one average ${category} expense could save about ${formatCurrency(averageSpend)} in ${formatMonthLabel(month)}.`;
}

// Estimates remaining money after projected month-end spending.
function buildForecastedMonthEndSavingsInsight(currentTotal, budget, month) {
  if (!budget) {
    return `Set a budget for ${formatMonthLabel(month)} to forecast month-end savings.`;
  }

  const projectedSpending = getProjectedMonthEndSpending(currentTotal, month);
  const expectedSavings = budget - projectedSpending;

  if (expectedSavings <= 0) {
    return `At current pace, no saving is expected for ${formatMonthLabel(month)}.`;
  }

  return `At current pace, expected savings for ${formatMonthLabel(month)}: ${formatCurrency(expectedSavings)}.`;
}

// Treats essential expenses as needs and non-essential expenses as wants, then
// explains each group's share of total spending.
function buildSpendingEfficiencyInsight(currentExpenses, currentTotal, month) {
  if (!currentExpenses.length || currentTotal === 0) {
    return `Add needs and wants for ${formatMonthLabel(month)} to compare spending efficiency.`;
  }

  const totals = currentExpenses.reduce(
    (result, exp) => {
      const type = exp.isEssential === false ? "wants" : "needs";
      result[type] += Number(exp.amount || 0);
      return result;
    },
    { needs: 0, wants: 0 }
  );
  const needsPercent = Math.round((totals.needs / currentTotal) * 100);
  const wantsPercent = Math.round((totals.wants / currentTotal) * 100);
  const balanceText = totals.wants > totals.needs
    ? "Wants are taking the larger share."
    : totals.needs > totals.wants
      ? "Needs are taking the larger share."
      : "Needs and wants are evenly balanced.";

  return `Needs: ${needsPercent}% (${formatCurrency(totals.needs)}), wants: ${wantsPercent}% (${formatCurrency(totals.wants)}). ${balanceText}`;
}

// Compares weekday and weekend totals to identify a simple spending pattern.
function buildPatternInsight(currentExpenses, month) {
  if (!currentExpenses.length) {
    return `No spending pattern is available for ${formatMonthLabel(month)} yet.`;
  }

  const dayTypeSpend = {
    weekday: 0,
    weekend: 0
  };

  currentExpenses.forEach(exp => {
    const day = new Date(exp.date).getDay();
    const type = day === 0 || day === 6 ? "weekend" : "weekday";
    dayTypeSpend[type] += Number(exp.amount || 0);
  });

  if (dayTypeSpend.weekend > dayTypeSpend.weekday) {
    return `Most ${formatMonthLabel(month)} spending occurs during weekends.`;
  }

  if (dayTypeSpend.weekday > dayTypeSpend.weekend) {
    return `Most ${formatMonthLabel(month)} spending occurs during weekdays.`;
  }

  return `${formatMonthLabel(month)} spending is evenly split between weekdays and weekends.`;
}
