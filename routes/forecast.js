const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const auth = require("../middleware/auth");

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const endOfToday = new Date(year, month, now.getDate(), 23, 59, 59, 999);
    const daysPassed = now.getDate();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

    const expenses = await Expense.find({
      userId: req.user.id,
      date: { $gte: startOfMonth, $lte: endOfToday }
    });

    const spentSoFar = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );

    const budgetDoc = await Budget.findOne({
      userId: req.user.id,
      month: monthKey
    });
    const budget = budgetDoc ? budgetDoc.amount : 0;

    if (spentSoFar === 0) {
      return res.json({
        averageDailySpending: 0,
        projectedMonthEndSpending: 0,
        remainingBudget: budget,
        budget,
        budgetRiskAmount: 0,
        message: "Not enough expense data to forecast yet.",
        explanation: "Add expenses this month so the forecast can use your current spending pace."
      });
    }

    const averageDailySpending = Math.round(spentSoFar / daysPassed);
    const projectedMonthEndSpending = Math.round(
      (spentSoFar / daysPassed) * totalDays
    );
    const remainingBudget = Math.max(budget - spentSoFar, 0);
    const budgetRiskAmount = Math.max(projectedMonthEndSpending - budget, 0);

    let message = "Set a monthly budget to compare your forecast.";

    if (budget) {
      if (budgetRiskAmount > 0) {
        message = `At your current pace, you may exceed your budget by ₹${budgetRiskAmount}.`;
      } else {
        message = `At your current pace, you may stay ₹${budget - projectedMonthEndSpending} under budget.`;
      }
    }

    res.json({
      averageDailySpending,
      projectedMonthEndSpending,
      remainingBudget,
      budget,
      budgetRiskAmount,
      message,
      explanation: `Forecast calculated from ₹${spentSoFar} spent over ${daysPassed} day(s), multiplied across ${totalDays} days in this month.`
    });
  } catch (error) {
    console.error("Forecast error:", error);
    res.status(500).json({ error: "Forecast failed" });
  }
});

module.exports = router;
