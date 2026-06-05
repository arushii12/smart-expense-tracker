const express = require("express");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const auth = require("../middleware/auth");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");

const router = express.Router();

router.use(auth);

let fontRegular = "Helvetica";
let fontBold = "Helvetica-Bold";

function registerFonts(doc) {
  const regularPath = "C:/Windows/Fonts/arial.ttf";
  const boldPath = "C:/Windows/Fonts/arialbd.ttf";

  if (fs.existsSync(regularPath)) {
    doc.registerFont("StatementRegular", regularPath);
    fontRegular = "StatementRegular";
  }

  if (fs.existsSync(boldPath)) {
    doc.registerFont("StatementBold", boldPath);
    fontBold = "StatementBold";
  }
}

function isValidMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return false;
  const [, month] = String(value).split("-").map(Number);
  return month >= 1 && month <= 12;
}

function getMonthKey(date) {
  const expenseDate = new Date(date);
  return `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1),
    end: new Date(year, monthNumber, 0, 23, 59, 59, 999)
  };
}

function formatCurrency(amount) {
  return `\u20B9${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function formatMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

async function buildFinancialStatement(userId, filters = {}) {
  const { fromMonth, toMonth } = filters;
  const budgetQuery = { userId };
  const expenseQuery = { userId };

  if (fromMonth || toMonth) {
    budgetQuery.month = {};
    if (fromMonth) budgetQuery.month.$gte = fromMonth;
    if (toMonth) budgetQuery.month.$lte = toMonth;
  }

  if (fromMonth && toMonth) {
    const fromRange = getMonthRange(fromMonth);
    const toRange = getMonthRange(toMonth);
    expenseQuery.date = { $gte: fromRange.start, $lte: toRange.end };
  } else if (fromMonth) {
    expenseQuery.date = { $gte: getMonthRange(fromMonth).start };
  } else if (toMonth) {
    expenseQuery.date = { $lte: getMonthRange(toMonth).end };
  }

  const [budgets, expenses] = await Promise.all([
    Budget.find(budgetQuery).sort({ month: 1 }),
    Expense.find(expenseQuery).sort({ date: 1 })
  ]);

  const monthMap = new Map();

  budgets.forEach(budget => {
    const month = budget.month;
    if (!monthMap.has(month)) {
      monthMap.set(month, { month, monthlyBudget: 0, monthlyExpenses: 0 });
    }
    monthMap.get(month).monthlyBudget += Number(budget.amount) || 0;
  });

  expenses.forEach(expense => {
    const month = getMonthKey(expense.date);
    if (!monthMap.has(month)) {
      monthMap.set(month, { month, monthlyBudget: 0, monthlyExpenses: 0 });
    }
    monthMap.get(month).monthlyExpenses += Number(expense.amount) || 0;
  });

  let cumulativeBudget = 0;
  let cumulativeExpenses = 0;
  const rows = Array.from(monthMap.values())
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(row => {
      const monthlyBudget = Number(row.monthlyBudget) || 0;
      const monthlyExpenses = Number(row.monthlyExpenses) || 0;
      const monthlySavings = monthlyBudget - monthlyExpenses;
      cumulativeBudget += monthlyBudget;
      cumulativeExpenses += monthlyExpenses;

      return {
        month: row.month,
        monthLabel: formatMonth(row.month),
        monthlyBudget,
        monthlyExpenses,
        monthlySavings,
        cumulativeBudget,
        cumulativeExpenses,
        cumulativeSavings: cumulativeBudget - cumulativeExpenses
      };
    });

  const totalBudget = rows.reduce((sum, row) => sum + row.monthlyBudget, 0);
  const totalExpenses = rows.reduce((sum, row) => sum + row.monthlyExpenses, 0);
  const totalSavings = totalBudget - totalExpenses;

  return {
    filters: {
      fromMonth: fromMonth || "",
      toMonth: toMonth || ""
    },
    summary: {
      totalBudget,
      totalExpenses,
      totalSavings,
      averageMonthlySavings: rows.length ? totalSavings / rows.length : 0
    },
    rows
  };
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

router.get("/", async (req, res) => {
  try {
    const filters = normalizeFilters(req, res);
    if (!filters) return;

    const statement = await buildFinancialStatement(req.user.id, filters);
    res.json(statement);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch financial statement",
      error: error.message
    });
  }
});

router.get("/pdf", async (req, res) => {
  try {
    const filters = normalizeFilters(req, res);
    if (!filters) return;

    const statement = await buildFinancialStatement(req.user.id, filters);
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    registerFonts(doc);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=financial-statement.pdf");
    doc.pipe(res);

    doc.font(fontBold).fontSize(20).fillColor("#102a43").text("Financial Statement");
    doc.moveDown(0.3);
    doc.font(fontRegular).fontSize(10).fillColor("#64748b")
      .text("Track month-wise budget, expenses, savings, and cumulative savings.");
    doc.moveDown(0.8);
    doc.font(fontBold).fontSize(10).fillColor("#1f2937")
      .text(`Total Budget: ${formatCurrency(statement.summary.totalBudget)}   Total Expenses: ${formatCurrency(statement.summary.totalExpenses)}   Total Savings: ${formatCurrency(statement.summary.totalSavings)}   Average Monthly Savings: ${formatCurrency(statement.summary.averageMonthlySavings)}`);
    doc.moveDown(1);

    const columns = [
      ["Month", 70],
      ["Budget", 88],
      ["Expenses", 88],
      ["Monthly Savings", 104],
      ["Cum. Budget", 100],
      ["Cum. Expenses", 104],
      ["Cum. Savings", 100]
    ];
    let x = 40;
    const startY = doc.y;
    doc.rect(40, startY - 4, 760, 22).fill("#e8f3f4");
    doc.fillColor("#102a43").font(fontBold).fontSize(9);
    columns.forEach(([label, width]) => {
      doc.text(label, x + 4, startY, { width: width - 8 });
      x += width;
    });

    doc.font(fontRegular).fontSize(9);
    let y = startY + 24;
    statement.rows.forEach(row => {
      if (y > 520) {
        doc.addPage();
        y = 40;
      }
      x = 40;
      const values = [
        row.monthLabel,
        formatCurrency(row.monthlyBudget),
        formatCurrency(row.monthlyExpenses),
        formatCurrency(row.monthlySavings),
        formatCurrency(row.cumulativeBudget),
        formatCurrency(row.cumulativeExpenses),
        formatCurrency(row.cumulativeSavings)
      ];

      values.forEach((value, index) => {
        const width = columns[index][1];
        const isSavingsColumn = index === 3 || index === 6;
        doc.fillColor(isSavingsColumn && String(value).includes("-") ? "#dc2626" : "#1f2937")
          .text(value, x + 4, y, { width: width - 8 });
        x += width;
      });
      y += 22;
    });

    if (!statement.rows.length) {
      doc.fillColor("#64748b").text("No financial statement data is available for this range.", 44, y);
    }

    doc.end();
  } catch (error) {
    res.status(500).json({
      message: "Failed to export financial statement",
      error: error.message
    });
  }
});

module.exports = router;
