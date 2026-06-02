const express = require("express");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const auth = require("../middleware/auth");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const User = require("../models/User");

const router = express.Router();

router.use(auth);

let fontRegular = "Helvetica";
let fontBold = "Helvetica-Bold";

function registerFonts(doc) {
  const regularPath = "C:/Windows/Fonts/arial.ttf";
  const boldPath = "C:/Windows/Fonts/arialbd.ttf";

  if (fs.existsSync(regularPath)) {
    doc.registerFont("ReportRegular", regularPath);
    fontRegular = "ReportRegular";
  }

  if (fs.existsSync(boldPath)) {
    doc.registerFont("ReportBold", boldPath);
    fontBold = "ReportBold";
  }
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(amount) {
  return `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;
}

function getCategoryTotals(expenses) {
  return expenses.reduce((totals, expense) => {
    totals[expense.category] =
      (totals[expense.category] || 0) + Number(expense.amount);
    return totals;
  }, {});
}

function getHighestCategory(categoryTotals) {
  const entries = Object.entries(categoryTotals);
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0];
}

function buildInsights(currentExpenses, allExpenses, currentTotal, previousTotal, budget) {
  const insights = [];
  const categoryTotals = getCategoryTotals(currentExpenses);
  const highestCategory = getHighestCategory(categoryTotals);

  if (highestCategory && currentTotal > 0) {
    const [category, amount] = highestCategory;
    const percent = Math.round((amount / currentTotal) * 100);
    insights.push(`${category} accounts for ${percent}% of your spending this month.`);
  } else {
    insights.push("No current-month category pattern is available yet.");
  }

  if (previousTotal > 0) {
    const trendPercent = Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
    if (trendPercent > 0) {
      insights.push(`Spending increased by ${trendPercent}% compared to last month.`);
    } else if (trendPercent < 0) {
      insights.push(`Spending decreased by ${Math.abs(trendPercent)}% compared to last month.`);
    } else {
      insights.push("Spending is unchanged compared to last month.");
    }
  } else {
    insights.push("There is not enough previous-month data for a trend comparison.");
  }

  if (highestCategory) {
    const [category, amount] = highestCategory;
    const count = currentExpenses.filter(expense => expense.category === category).length;
    const averageSpend = count > 0 ? Math.round(amount / count) : 0;
    insights.push(
      `Skipping one average ${category} expense could save approximately ${formatCurrency(averageSpend)} this month.`
    );
  } else {
    insights.push("Add more expenses to unlock savings recommendations.");
  }

  const dayTypeSpend = { weekday: 0, weekend: 0 };
  allExpenses.forEach(expense => {
    const day = new Date(expense.date).getDay();
    const type = day === 0 || day === 6 ? "weekend" : "weekday";
    dayTypeSpend[type] += Number(expense.amount);
  });

  if (dayTypeSpend.weekend > dayTypeSpend.weekday) {
    insights.push("Most spending occurs during weekends.");
  } else if (dayTypeSpend.weekday > dayTypeSpend.weekend) {
    insights.push("Most spending occurs during weekdays.");
  } else {
    insights.push("Spending is evenly split between weekdays and weekends.");
  }

  if (!budget) {
    insights.push("Set a monthly budget to unlock budget risk analysis.");
  }

  return insights;
}

function drawSectionTitle(doc, title) {
  doc.moveDown(1.2);
  doc.fontSize(14).fillColor("#1b3a4b").font(fontBold).text(title);
  doc.moveDown(0.4);
  doc.strokeColor("#d7b899").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.7);
}

function drawKeyValue(doc, label, value) {
  doc
    .fontSize(10)
    .fillColor("#5E503F")
    .font(fontBold)
    .text(label, { continued: true })
    .fillColor("#1f2933")
    .font(fontRegular)
    .text(` ${value}`);
}

router.get("/monthly", async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthKey = getMonthKey(now);
    const previousMonthDate = new Date(year, month - 1, 1);
    const previousMonthKey = getMonthKey(previousMonthDate);
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const startOfPreviousMonth = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth(), 1);
    const endOfPreviousMonth = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const [userData, currentExpenses, previousExpenses, allExpenses, budgetDoc] =
      await Promise.all([
        User.findById(req.user.id),
        Expense.find({
          userId: req.user.id,
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }).sort({ date: 1 }),
        Expense.find({
          userId: req.user.id,
          date: { $gte: startOfPreviousMonth, $lte: endOfPreviousMonth }
        }),
        Expense.find({ userId: req.user.id }),
        Budget.findOne({ userId: req.user.id, month: monthKey })
      ]);

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = {
      name: userData.name,
      email: userData.email
    };

    const budget = budgetDoc ? budgetDoc.amount : 0;
    const totalSpending = currentExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );
    const previousTotal = previousExpenses.reduce(
      (sum, expense) => sum + Number(expense.amount),
      0
    );
    const remainingBudget = Math.max(budget - totalSpending, 0);
    const categoryTotals = getCategoryTotals(currentExpenses);
    const highestCategory = getHighestCategory(categoryTotals);
    const daysPassed = now.getDate();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const averageDailySpending = totalSpending
      ? Math.round(totalSpending / daysPassed)
      : 0;
    const projectedMonthEndSpending = totalSpending
      ? Math.round((totalSpending / daysPassed) * totalDays)
      : 0;
    const budgetRiskAmount = Math.max(projectedMonthEndSpending - budget, 0);
    const insights = buildInsights(
      currentExpenses,
      allExpenses,
      totalSpending,
      previousTotal,
      budget
    );

    const reportMonth = now.toLocaleString("en-IN", {
      month: "long",
      year: "numeric"
    });
    const filename = `monthly-finance-report-${monthKey}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: "A4" });
    registerFonts(doc);
    doc.pipe(res);

    doc
      .rect(0, 0, doc.page.width, 110)
      .fill("#B3DEE2");
    doc
      .fillColor("#1b3a4b")
      .font(fontBold)
      .fontSize(24)
      .text("Monthly Finance Report", 50, 35);
    doc
      .font(fontRegular)
      .fontSize(11)
      .fillColor("#344e41")
      .text(`Generated on ${now.toLocaleDateString("en-IN")}`, 50, 68);
    doc.y = 135;

    drawSectionTitle(doc, "Report Details");
    drawKeyValue(doc, "User:", `${user.name} (${user.email})`);
    drawKeyValue(doc, "Report month:", reportMonth);

    drawSectionTitle(doc, "Financial Summary");
    drawKeyValue(doc, "Total spending:", formatCurrency(totalSpending));
    drawKeyValue(doc, "Budget amount:", budget ? formatCurrency(budget) : "No budget set");
    drawKeyValue(doc, "Remaining budget:", formatCurrency(remainingBudget));
    drawKeyValue(
      doc,
      "Highest spending category:",
      highestCategory
        ? `${highestCategory[0]} (${formatCurrency(highestCategory[1])})`
        : "No expenses recorded"
    );

    drawSectionTitle(doc, "Category-wise Spending Breakdown");
    if (Object.keys(categoryTotals).length) {
      Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, amount]) => {
          const percent = totalSpending
            ? Math.round((amount / totalSpending) * 100)
            : 0;
          doc
            .fontSize(10)
            .fillColor("#1f2933")
            .font(fontRegular)
            .text(`${category}: ${formatCurrency(amount)} (${percent}%)`);
        });
    } else {
      doc.fontSize(10).fillColor("#1f2933").text("No expenses recorded for this month.");
    }

    drawSectionTitle(doc, "AI Insights Summary");
    insights.forEach(insight => {
      doc.fontSize(10).fillColor("#1f2933").text(`• ${insight}`, {
        paragraphGap: 4
      });
    });

    drawSectionTitle(doc, "Forecast Summary");
    drawKeyValue(doc, "Average daily spending:", formatCurrency(averageDailySpending));
    drawKeyValue(doc, "Projected month-end spending:", formatCurrency(projectedMonthEndSpending));
    drawKeyValue(
      doc,
      "Budget risk:",
      budget
        ? budgetRiskAmount > 0
          ? `May exceed budget by ${formatCurrency(budgetRiskAmount)}`
          : `Projected to stay ${formatCurrency(budget - projectedMonthEndSpending)} under budget`
        : "No budget set"
    );
    doc
      .moveDown(0.5)
      .fontSize(10)
      .fillColor("#344e41")
      .text(
        `Forecast calculated from ${formatCurrency(totalSpending)} spent over ${daysPassed} day(s), multiplied across ${totalDays} days in ${reportMonth}.`
      );

    doc.end();
  } catch (error) {
    console.error("Report export error:", error);
    res.status(500).json({
      message: "Failed to export report",
      error: error.message
    });
  }
});

module.exports = router;
