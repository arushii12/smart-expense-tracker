
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

loadEnvFile();

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
app.use("/forecast", forecastRoutes);
app.use("/report", reportRoutes);
app.use("/api/receipts", receiptRoutes);
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
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

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
