
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
const budgetRoutes = require("./routes/budget");
const forecastRoutes = require("./routes/forecast");

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
app.use("/expenses", expenseRoutes);
app.use("/budget", budgetRoutes);
app.use("/forecast", forecastRoutes);

// ==============================
// Server start
// ==============================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});