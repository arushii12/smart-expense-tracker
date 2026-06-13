
/*
 * Main Express application entry point.
 * Loads local configuration, waits for MongoDB, mounts every backend router, and
 * serves the frontend/uploads when this process hosts the complete application.
 */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

loadEnvFile();

// ==============================
// Database connection
// (must load BEFORE routes)
// ==============================
const { databaseReady } = require("./db");

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
const analyticsRoutes = require("./routes/analytics");
const incomeRoutes = require("./routes/income");
const paytmStatementRoutes = require("./routes/paytmStatements");

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
// Every request waits for the shared MongoDB initialization promise. A failed
// connection produces a clear 503 instead of allowing routes to query no database.
app.use(async (req, res, next) => {
  try {
    await databaseReady;
    next();
  } catch (error) {
    res.status(503).json({
      message: "Database connection is unavailable. Please try again shortly."
    });
  }
});

// ==============================
// Route usage
// ==============================
// Lightweight deployment/startup check. Database middleware above ensures that
// "ok" also means the application completed MongoDB initialization.
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
app.use("/api/analytics", analyticsRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/paytm-statements", paytmStatementRoutes);
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

// ==============================
// Server start
// ==============================
if (require.main === module) {
  // Listen only after MongoDB and required indexes are ready.
  databaseReady
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch(error => {
      console.error("MongoDB initialization failed:", error.message);
      process.exitCode = 1;
    });
}

module.exports = app;

// Reads simple KEY=VALUE entries from the local .env file before database and
// route modules load. Existing operating-system variables take precedence.
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
