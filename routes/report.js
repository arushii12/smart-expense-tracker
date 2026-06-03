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

function isValidMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return false;
  const [, month] = String(value).split("-").map(Number);
  return month >= 1 && month <= 12;
}

function formatCurrency(amount) {
  return `\u20B9${Math.round(amount || 0).toLocaleString("en-IN")}`;
}

function formatReportDate(date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
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

function getDayTypeSpend(expenses) {
  return expenses.reduce((totals, expense) => {
    const day = new Date(expense.date).getDay();
    const type = day === 0 || day === 6 ? "weekend" : "weekday";
    totals[type] += Number(expense.amount);
    return totals;
  }, { weekday: 0, weekend: 0 });
}

function buildInsights(currentExpenses, currentTotal, previousTotal, budget) {
  const insights = [];
  const categoryTotals = getCategoryTotals(currentExpenses);
  const highestCategory = getHighestCategory(categoryTotals);
  const dayTypeSpend = getDayTypeSpend(currentExpenses);

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
      insights.push(`Up ${trendPercent}% from ${formatCurrency(previousTotal)} last month.`);
    } else if (trendPercent < 0) {
      insights.push(`Down ${Math.abs(trendPercent)}% from ${formatCurrency(previousTotal)} last month.`);
    } else {
      insights.push(`Spending is unchanged from ${formatCurrency(previousTotal)} last month.`);
    }
  } else {
    insights.push("There is not enough previous-month data for a trend comparison.");
  }

  if (highestCategory) {
    const [category, amount] = highestCategory;
    const count = currentExpenses.filter(expense => expense.category === category).length;
    const averageSpend = count > 0 ? Math.round(amount / count) : 0;
    insights.push(
      `Skipping one average ${category} transaction could save approximately ${formatCurrency(averageSpend)} this month.`
    );
  } else {
    insights.push("Add more expenses to unlock savings recommendations.");
  }

  if (dayTypeSpend.weekend > dayTypeSpend.weekday) {
    insights.push(`Most spending occurs during weekends. Weekday spending: ${formatCurrency(dayTypeSpend.weekday)} / Weekend spending: ${formatCurrency(dayTypeSpend.weekend)}.`);
  } else if (dayTypeSpend.weekday > dayTypeSpend.weekend) {
    insights.push(`Most spending occurs during weekdays. Weekday spending: ${formatCurrency(dayTypeSpend.weekday)} / Weekend spending: ${formatCurrency(dayTypeSpend.weekend)}.`);
  } else {
    insights.push(`Spending is evenly split. Weekday spending: ${formatCurrency(dayTypeSpend.weekday)} / Weekend spending: ${formatCurrency(dayTypeSpend.weekend)}.`);
  }

  if (!budget) {
    insights.push("Set a monthly budget to unlock budget risk analysis.");
  }

  return insights;
}

function getRiskLevel({ budget, projectedMonthEndSpending, isEarlyEstimate }) {
  if (!budget) return "No budget set";
  if (isEarlyEstimate) return "Early estimate";

  const ratio = projectedMonthEndSpending / budget;
  if (ratio >= 1) return "High Risk";
  if (ratio >= 0.85) return "Moderate Risk";
  return "Low Risk";
}

function drawSectionTitle(doc, title) {
  doc.moveDown(1.2);
  doc.fontSize(14).fillColor("#1b3a4b").font(fontBold).text(title);
  doc.moveDown(0.4);
  doc.strokeColor("#d7b899").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.7);
}

function drawKeyValue(doc, label, value, options = {}) {
  const lineGap = options.lineGap || 0;
  doc
    .fontSize(10)
    .fillColor("#5E503F")
    .font(fontBold)
    .text(label, { continued: true })
    .fillColor("#1f2933")
    .font(fontRegular)
    .text(` ${value}`);
  if (lineGap) doc.moveDown(lineGap);
}

router.get("/monthly", async (req, res) => {
  try {
    const now = new Date();
    const requestedMonth = req.query.month || getMonthKey(now);

    if (!isValidMonth(requestedMonth)) {
      return res.status(400).json({ message: "Please select a valid report month" });
    }

    const [year, monthNumber] = requestedMonth.split("-").map(Number);
    const month = monthNumber - 1;
    const reportDate = new Date(year, month, 1);
    const monthKey = requestedMonth;
    const previousMonthDate = new Date(year, month - 1, 1);
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const startOfPreviousMonth = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth(), 1);
    const endOfPreviousMonth = new Date(previousMonthDate.getFullYear(), previousMonthDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const [userData, currentExpenses, previousExpenses, budgetDoc] =
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
        Budget.findOne({ userId: req.user.id, month: monthKey })
      ]);

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

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
    const remainingPercent = budget ? Math.round((remainingBudget / budget) * 100) : 0;
    const categoryTotals = getCategoryTotals(currentExpenses);
    const highestCategory = getHighestCategory(categoryTotals);
    const isCurrentMonth = monthKey === getMonthKey(now);
    const daysPassed = isCurrentMonth ? now.getDate() : new Date(year, month + 1, 0).getDate();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const isEarlyEstimate = daysPassed < 7;
    const averageWindowDays = Math.max(daysPassed, 7);
    const averageDailySpending = totalSpending
      ? Math.round(totalSpending / averageWindowDays)
      : 0;
    const projectedMonthEndSpending = totalSpending
      ? Math.round((totalSpending / averageWindowDays) * totalDays)
      : 0;
    const budgetRiskAmount = Math.max(projectedMonthEndSpending - budget, 0);
    const riskLevel = getRiskLevel({ budget, projectedMonthEndSpending, isEarlyEstimate });
    const insights = buildInsights(
      currentExpenses,
      totalSpending,
      previousTotal,
      budget
    );

    const reportMonth = reportDate.toLocaleString("en-IN", {
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
      .text("Smart Home Finance Hub", 50, 35);
    doc
      .font(fontRegular)
      .fontSize(11)
      .fillColor("#344e41")
      .text(`Generated on ${formatReportDate(now)}`, 50, 68);
    doc.y = 135;

    drawSectionTitle(doc, "Report Overview");
    drawKeyValue(doc, "User:", `${userData.name} (${userData.email})`, { lineGap: 0.15 });
    drawKeyValue(doc, "Report month:", reportMonth, { lineGap: 0.15 });
    drawKeyValue(doc, "Days tracked:", `${daysPassed} of ${totalDays}`, { lineGap: 0.15 });

    drawSectionTitle(doc, "Monthly Financial Snapshot");
    drawKeyValue(doc, "Actual Spending:", formatCurrency(totalSpending), { lineGap: 0.15 });
    drawKeyValue(doc, "Monthly Budget:", budget ? formatCurrency(budget) : "No budget set", { lineGap: 0.15 });
    drawKeyValue(
      doc,
      "Remaining Budget:",
      budget
        ? `${formatCurrency(remainingBudget)} remaining / ${remainingPercent}% budget left`
        : formatCurrency(remainingBudget),
      { lineGap: 0.15 }
    );
    drawKeyValue(
      doc,
      "Top Spending Category:",
      highestCategory
        ? `${highestCategory[0]} - ${formatCurrency(highestCategory[1])}`
        : "No expenses recorded",
      { lineGap: 0.15 }
    );

    drawSectionTitle(doc, "Spending by Category");
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
          doc.moveDown(0.15);
        });
    } else {
      doc.fontSize(10).fillColor("#1f2933").text("No expenses recorded for this month.");
    }

    drawSectionTitle(doc, "Smart Insights");
    insights.forEach(insight => {
      doc.fontSize(10).fillColor("#1f2933").text(`\u2022 ${insight}`, {
        paragraphGap: 4
      });
    });

    drawSectionTitle(doc, "Month-End Forecast");
    drawKeyValue(doc, "Forecast type:", isEarlyEstimate ? "Early Estimate" : "Month-End Forecast");
    drawKeyValue(doc, "Average daily spending:", formatCurrency(averageDailySpending));
    drawKeyValue(doc, "Projected month-end spending:", formatCurrency(projectedMonthEndSpending));
    drawKeyValue(
      doc,
      "Budget risk:",
      budget
        ? isEarlyEstimate
          ? `Early estimate (${riskLevel})`
          : budgetRiskAmount > 0
            ? `${riskLevel}: May exceed budget by ${formatCurrency(budgetRiskAmount)}`
            : `${riskLevel}: Projected to stay ${formatCurrency(budget - projectedMonthEndSpending)} under budget`
        : "No budget set"
    );

    if (isEarlyEstimate) {
      doc
        .moveDown(0.4)
        .fontSize(10)
        .fillColor("#7c2d12")
        .font(fontBold)
        .text(`Early estimate based on only ${daysPassed} day(s) of data. A minimum 7-day average is used.`);
    }

    doc
      .moveDown(0.5)
      .fontSize(9)
      .fillColor("#344e41")
      .font(fontRegular)
      .text(
        `Forecast calculated from ${formatCurrency(totalSpending)} spent over ${averageWindowDays} day(s) average window, multiplied across ${totalDays} days in ${reportMonth}. If fewer than 7 days are available, total spending is divided by 7.`
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
