
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

loadEnvFile();
migrateLegacyBudgetIncomeFlags();

// ==============================
// Database connection
// (must load BEFORE routes)
// ==============================
require("./db");

// ==============================
// Routes
// ==============================
const expenseRoutes = require("./routes/expenses");
const authRoutes = require("./routes/auth");
const budgetRoutes = require("./routes/budget");
const forecastRoutes = require("./routes/forecast");
const reportRoutes = require("./routes/report");
const receiptRoutes = require("./routes/receipts");
const profileRoutes = require("./routes/profile");
const financialStatementRoutes = require("./routes/financialStatement");
const incomeRoutes = require("./routes/income");

// ==============================
// App setup
// ==============================
const app = express();
const PORT = process.env.PORT || 5000;
const frontendPath = path.join(__dirname, "frontend");
const uploadsPath = path.join(__dirname, "uploads");
const shouldServeFrontend = process.env.SERVE_FRONTEND !== "false";

// ==============================
// Middleware
// ==============================
const corsOptions = process.env.CORS_ORIGIN
  ? { origin: process.env.CORS_ORIGIN.split(",").map(origin => origin.trim()) }
  : undefined;

app.use(cors(corsOptions));
app.use(express.json());

// ==============================
// Route usage
// ==============================
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "smart-expense-tracker"
  });
});

app.use("/auth", authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/budget", budgetRoutes);
app.use("/income", incomeRoutes);
app.use("/forecast", forecastRoutes);
app.use("/report", reportRoutes);
app.use("/api/financial-statement", financialStatementRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/profile", profileRoutes);
app.use("/profile", profileRoutes);
app.use("/uploads", express.static(uploadsPath));

// ==============================
// Production frontend
// ==============================
if (shouldServeFrontend && fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

function migrateLegacyBudgetIncomeFlags() {
  const budgetsPath = path.join(__dirname, "data", "budgets.json");
  const incomesPath = path.join(__dirname, "data", "incomes.json");

  if (!fs.existsSync(budgetsPath)) return;

  try {
    const budgets = JSON.parse(fs.readFileSync(budgetsPath, "utf8") || "[]");
    const incomes = fs.existsSync(incomesPath)
      ? JSON.parse(fs.readFileSync(incomesPath, "utf8") || "[]")
      : [];
    const incomeTotalsByKey = incomes.reduce((totals, income) => {
      const key = `${income.userId}|${income.month}`;
      totals[key] = (totals[key] || 0) + Number(income.amount || 0);
      return totals;
    }, {});
    let changed = false;

    const migratedBudgets = budgets.map(budget => {
      if (!budget || !Object.prototype.hasOwnProperty.call(budget, "incomeSeparated")) {
        return budget;
      }

      changed = true;
      const key = `${budget.userId}|${budget.month}`;
      const incomeTotal = incomeTotalsByKey[key] || 0;
      const budgetUpdatedAt = Date.parse(budget.updatedAt);
      const hasMatchingIncomeMutation = incomeTotal > 0 && incomes.some(income => {
        if (income.userId !== budget.userId || income.month !== budget.month) return false;

        const incomeCreatedAt = Date.parse(income.createdAt);
        const incomeUpdatedAt = Date.parse(income.updatedAt);
        return [incomeCreatedAt, incomeUpdatedAt].some(timestamp =>
          !Number.isNaN(timestamp) &&
          !Number.isNaN(budgetUpdatedAt) &&
          Math.abs(timestamp - budgetUpdatedAt) <= 60 * 1000
        );
      });
      const correctedAmount = hasMatchingIncomeMutation
        ? Math.max(Number(budget.amount || 0) - incomeTotal, 0)
        : Number(budget.amount || 0);

      console.warn(
        `[Budget migration warning] Removed stale incomeSeparated flag for user ${budget.userId}, month ${budget.month}. ` +
        (
          hasMatchingIncomeMutation
            ? `Auto-separated likely mutated budget ${budget.amount} into original budget ${correctedAmount} plus additional income ${incomeTotal}.`
            : `Please manually verify the original budget amount (${budget.amount}) if this month was affected by earlier income/budget mutation.`
        )
      );

      const { incomeSeparated, ...cleanBudget } = budget;
      return {
        ...cleanBudget,
        amount: correctedAmount
      };
    });

    if (changed) {
      fs.writeFileSync(budgetsPath, JSON.stringify(migratedBudgets, null, 2), "utf8");
    }
  } catch (error) {
    console.warn(`[Budget migration warning] Unable to inspect legacy budget flags: ${error.message}`);
  }
}

// ==============================
// Server start
// ==============================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  lines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) return;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}
