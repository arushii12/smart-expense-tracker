const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");

router.get("/", async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const startOfMonth = new Date(year, month, 1);
    const today = new Date(year, month, now.getDate());

    // 🔹 Fetch ONLY current month expenses
    const expenses = await Expense.find({
      date: { $gte: startOfMonth, $lte: today }
    });

    const spentSoFar = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    const daysPassed = now.getDate();
    const totalDays = new Date(year, month + 1, 0).getDate();

    if (daysPassed === 0 || spentSoFar === 0) {
      return res.json({
        forecast: 0,
        message: "Not enough data to forecast yet"
      });
    }

    const dailyAvg = spentSoFar / daysPassed;
    const forecast = Math.round(dailyAvg * totalDays);

    // Fetch budget
   const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
const budgetDoc = await Budget.findOne({ month: monthKey });
    const budget = budgetDoc ? budgetDoc.amount : null;

    let statusMessage = "At this rate, spending looks normal";

    if (budget) {
      if (forecast > budget) {
        statusMessage = "At this rate, you may exceed your monthly budget";
      } else {
        statusMessage = "At this rate, you are within your budget";
      }
    }

    res.json({
      forecast,
      message: statusMessage
    });

  } catch (err) {
    console.error("Forecast error:", err);
    res.status(500).json({ error: "Forecast failed" });
  }
});

module.exports = router;
