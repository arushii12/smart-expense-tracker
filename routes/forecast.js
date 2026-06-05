const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const Income = require("../models/Income");
const auth = require("../middleware/auth");

router.use(auth);

function formatCurrency(amount) {
  return `\u20B9${Math.round(amount || 0).toLocaleString("en-IN")}`;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isValidMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return false;
  const [, month] = String(value).split("-").map(Number);
  return month >= 1 && month <= 12;
}

function getRiskLevel({ budget, projectedMonthEndSpending, isEarlyEstimate }) {
  if (!budget) return "No budget set";
  if (isEarlyEstimate) return "Early estimate";

  const ratio = projectedMonthEndSpending / budget;
  if (ratio >= 1) return "High Risk";
  if (ratio >= 0.85) return "Moderate Risk";
  return "Low Risk";
}

async function getAvailableBudget(userId, month) {
  const [budgetDoc, incomes] = await Promise.all([
    Budget.findOne({ userId, month }),
    Income.find({ userId, month })
  ]);
  const additionalIncome = incomes.reduce((sum, income) => sum + Number(income.amount || 0), 0);
  const baseBudget = budgetDoc ? Number(budgetDoc.amount) || 0 : 0;

  return baseBudget + additionalIncome;
}

router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const selectedMonth = req.query.month || getMonthKey(now);
    if (!isValidMonth(selectedMonth)) {
      return res.status(400).json({ message: "Please select a valid forecast month" });
    }

    const [year, monthNumber] = selectedMonth.split("-").map(Number);
    const month = monthNumber - 1;
    const isCurrentMonth = selectedMonth === getMonthKey(now);

    const startOfMonth = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const endOfToday = isCurrentMonth
      ? new Date(year, month, now.getDate(), 23, 59, 59, 999)
      : new Date(year, month + 1, 0, 23, 59, 59, 999);
    const daysPassed = isCurrentMonth ? now.getDate() : totalDays;
    const monthKey = selectedMonth;
    const isEarlyEstimate = daysPassed < 7;
    const averageWindowDays = Math.max(daysPassed, 7);

    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: startOfMonth, $lte: endOfToday }
    });

    const spentSoFar = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );

    const budget = await getAvailableBudget(req.user.id, monthKey);

    if (spentSoFar === 0) {
      return res.json({
        averageDailySpending: 0,
        projectedMonthEndSpending: 0,
        remainingBudget: budget,
        budget,
        budgetRiskAmount: 0,
        daysPassed,
        averageWindowDays,
        totalDays,
        isEarlyEstimate: true,
        forecastLabel: "Early Estimate",
        riskLevel: budget ? "Early estimate" : "No budget set",
        message: "Not enough expense data to forecast yet.",
        explanation: "Add expenses this month so the forecast can use your current spending pace. Forecast average uses at least 7 days to avoid early-month spikes."
      });
    }

    const averageDailySpending = Math.round(spentSoFar / averageWindowDays);
    const projectedMonthEndSpending = Math.round(
      (spentSoFar / averageWindowDays) * totalDays
    );
    const remainingBudget = Math.max(budget - spentSoFar, 0);
    const budgetRiskAmount = Math.max(projectedMonthEndSpending - budget, 0);
    const riskLevel = getRiskLevel({ budget, projectedMonthEndSpending, isEarlyEstimate });

    let message = isEarlyEstimate
      ? `Early estimate based on only ${daysPassed} day(s) of data. Add more expenses for a stronger forecast.`
      : "Set a monthly budget to compare your forecast.";

    if (budget && !isEarlyEstimate) {
      if (budgetRiskAmount > 0) {
        message = `At your current pace, you may exceed your budget by ${formatCurrency(budgetRiskAmount)}.`;
      } else {
        message = `At your current pace, you may stay ${formatCurrency(budget - projectedMonthEndSpending)} under budget.`;
      }
    }

    res.json({
      averageDailySpending,
      projectedMonthEndSpending,
      remainingBudget,
      budget,
      budgetRiskAmount,
      daysPassed,
      averageWindowDays,
      totalDays,
      isEarlyEstimate,
      forecastLabel: isEarlyEstimate ? "Early Estimate" : "Month-End Forecast",
      riskLevel,
      message,
      explanation: `Forecast calculated from ${formatCurrency(spentSoFar)} spent over ${averageWindowDays} day(s) average window, multiplied across ${totalDays} days in this month. A minimum 7-day average is used when fewer than 7 days of expenses are available.`
    });
  } catch (error) {
    console.error("Forecast error:", error);
    res.status(500).json({ error: "Forecast failed" });
  }
});

module.exports = router;
