
const express = require("express");
const cors = require("cors");

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

// ==============================
// App setup
// ==============================
const app = express();
const PORT = 5000;

// ==============================
// Middleware
// ==============================
app.use(cors());
app.use(express.json());

// ==============================
// Route usage
// ==============================
app.use("/auth", authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/budget", budgetRoutes);
app.use("/forecast", forecastRoutes);
app.use("/report", reportRoutes);

// ==============================
// Server start
// ==============================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
