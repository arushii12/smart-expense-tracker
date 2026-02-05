// ==============================
// GLOBAL STATE
// ==============================

let expenses = [];
let expenseChart = null;
let barChart = null;
let monthlyChart = null;

// ==============================
// DOM ELEMENTS
// ==============================

const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const expenseList = document.getElementById("expenseList");
const totalEl = document.getElementById("total");

const viewDateInput = document.getElementById("viewDate");
const historyLabel = document.getElementById("historyLabel");

// ==============================
// BUDGET DOM ELEMENTS
// ==============================

const budgetAmountEl = document.getElementById("budgetAmount");
const budgetSpentEl = document.getElementById("budgetSpent");
const budgetRemainingEl = document.getElementById("budgetRemaining");
const budgetBarFill = document.getElementById("budgetBarFill");
const budgetStatusEl = document.getElementById("budgetStatus");

// ==============================
// SMART INSIGHTS DOM ELEMENTS
// ==============================

const insightComparisonEl = document.getElementById("insightComparison");
const insightAverageEl = document.getElementById("insightAverage");
const insightExpensiveDayEl = document.getElementById("insightExpensiveDay");

// ==============================
// FORECAST DOM ELEMENTS
// ==============================

const forecastAmountEl = document.getElementById("forecastAmount");
const forecastMessageEl = document.getElementById("forecastMessage");



// ==============================
// FETCH TODAY'S EXPENSES ON LOAD
// ==============================

async function fetchTodayExpenses() {
  try {
    const res = await fetch("http://localhost:5000/expenses/today");
    expenses = await res.json();

    historyLabel.textContent = "Showing: Today";
    refreshUI();
  } catch (error) {
    console.error("Error fetching today's expenses:", error);
  }
}

fetchTodayExpenses();

// ==============================
// FETCH EXPENSES BY DATE
// ==============================

async function fetchExpensesByDate(date) {
  try {
    const res = await fetch(
      `http://localhost:5000/expenses/by-date?date=${date}`
    );
    expenses = await res.json();

    historyLabel.textContent = "Showing: " + formatFullDate(date);
    refreshUI();
  } catch (error) {
    console.error("Error fetching expenses by date:", error);
  }
}

// ==============================
// DATE FILTER LISTENER
// ==============================

if (viewDateInput) {
  viewDateInput.addEventListener("change", () => {
    if (viewDateInput.value) {
      fetchExpensesByDate(viewDateInput.value);
    } else {
      fetchTodayExpenses();
    }
  });
}

// ==============================
// ADD EXPENSE
// ==============================

async function addExpense() {
  const amount = amountInput.value;
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!amount || !category) {
    alert("Please enter amount and category");
    return;
  }

  try {
    await fetch("http://localhost:5000/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        category,
        date
      })
    });

    if (viewDateInput.value) {
      fetchExpensesByDate(viewDateInput.value);
    } else {
      fetchTodayExpenses();
    }

    amountInput.value = "";
    categoryInput.value = "";
    dateInput.value = "";

  } catch (error) {
    console.error("Error adding expense:", error);
  }
}

// ==============================
// DELETE EXPENSE
// ==============================

async function deleteExpense(id) {
  try {
    await fetch(`http://localhost:5000/expenses/${id}`, {
      method: "DELETE"
    });

    expenses = expenses.filter(exp => exp._id !== id);
    refreshUI();
  } catch (error) {
    console.error("Error deleting expense:", error);
  }
}

// ==============================
// UI REFRESH
// ==============================

function refreshUI() {
  renderExpenses();
  updateTotal();
  updatePieChart();
  updateBarChart();
  updateTopCategory();
  loadMonthlyTrend();
  loadCurrentBudget();
  updateSmartInsights(); 
  loadForecast();
}

// ==============================
// RENDER EXPENSE LIST
// ==============================

function renderExpenses() {
  expenseList.innerHTML = "";

  expenses.forEach(exp => {
    const li = document.createElement("li");

    const dateText = new Date(exp.date).toLocaleDateString("default", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    li.innerHTML = `
      <span>₹${exp.amount}</span>
      <span class="tag">${exp.category}</span>
      <span style="font-size:12px; opacity:0.6;">${dateText}</span>
      <button class="delete-btn">✕</button>
    `;

    li.querySelector(".delete-btn").addEventListener("click", () => {
      deleteExpense(exp._id);
    });

    expenseList.appendChild(li);
  });
}

// ==============================
// TOTAL SPENT
// ==============================

function updateTotal() {
  const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  totalEl.textContent = `₹${total}`;
}

// ==============================
// PIE CHART 
// ==============================

function updatePieChart() {
  const canvas = document.getElementById("expenseChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + Number(exp.amount);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (data.length === 0) {
    if (expenseChart) expenseChart.destroy();
    return;
  }

  const colors = [
    "#FF99C8",
    "#A9DEF9",
    "#D0F4DE",
    "#E4C1F9",
    "#FCF6BD",
    "#FFD6A5",
    "#BDB2FF"
  ];

  if (expenseChart) expenseChart.destroy();

  expenseChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: "#ffffff",
        borderWidth: 4,
        hoverOffset: 16
      }]
    },
    options: {
      responsive: true,
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 900
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 18,
            boxWidth: 14,
            font: {
              family: "Montserrat",
              size: 13,
              weight: "600"
            }
          }
        },
        tooltip: {
          backgroundColor: "#1f2933",
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label(context) {
              const value = context.raw;
              const total = data.reduce((a, b) => a + b, 0);
              const percent = ((value / total) * 100).toFixed(1);
              return `₹${value} • ${percent}%`;
            }
          }
        }
      }
    }
  });
}

// ==============================
// BAR CHART 
// ==============================

 function updateBarChart() {
  const canvas = document.getElementById("barChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  // Group totals by category
  const categoryTotals = {};
  expenses.forEach(exp => {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + Number(exp.amount);
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);

  if (labels.length === 0) {
    if (barChart) barChart.destroy();
    return;
  }

  // Beautiful fintech gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 350);
  gradient.addColorStop(0, "#7FB3D5");
  gradient.addColorStop(1, "#2E86C1");

  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Spending (₹)",
        data,
        backgroundColor: gradient,
        borderRadius: 18,
        barThickness: 42
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio:false,
      animation: {
        duration: 900,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1b3a4b",
          padding: 12,
          cornerRadius: 12,
          callbacks: {
            label: ctx => `₹${ctx.raw}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          grid: { color: "#e3e3e3" },
          ticks: {
            callback: v => `₹${v}`
          }
        }
      }
    }
  });
}


// ==============================
// TOP CATEGORY
// ==============================

function updateTopCategory() {
  const el = document.getElementById("topCategory");

  if (!el || expenses.length === 0) {
    el.textContent = "No data yet";
    return;
  }

  const totals = {};
  expenses.forEach(exp => {
    totals[exp.category] =
      (totals[exp.category] || 0) + Number(exp.amount);
  });

  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  el.textContent = `${top[0]} (₹${top[1]})`;
}

// ==============================
// MONTHLY TREND (UNCHANGED)
// ==============================

async function loadMonthlyTrend() {
  try {
    const res = await fetch("http://localhost:5000/expenses/monthly");
    const data = await res.json();

    if (!data || data.length === 0) {
      if (monthlyChart) monthlyChart.destroy();
      return;
    }

    const labels = data.map(d => formatMonth(d.month));
    const totals = data.map(d => d.totalSpent);

    const canvas = document.getElementById("monthlyChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Soft blue gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(125, 185, 232, 0.6)");
    gradient.addColorStop(1, "rgba(125, 185, 232, 0.05)");

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Monthly Spending",
          data: totals,
          borderColor: "#2E86C1",
          backgroundColor: gradient,
          fill: true,
          tension: 0.45,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: "#2E86C1"
        }]
      },
      options: {
        responsive: true,
        animation: {
          duration: 1000,
          easing: "easeOutQuart"
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1b3a4b",
            padding: 12,
            cornerRadius: 12,
            callbacks: {
              label: ctx => `₹${ctx.raw}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "#e3e3e3" },
            ticks: { callback: v => `₹${v}` }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

  } catch (err) {
    console.error("Monthly trend error:", err);
  }
}


// ==============================
// BUDGET LOGIC (ENHANCED)
// ==============================

function getCurrentMonthLabel() {
  const now = new Date();
  return now.toLocaleString("default", { month: "long", year: "numeric" });
}

 async function loadCurrentBudget() {
  try {
    const res = await fetch("http://localhost:5000/budget/current");
    const data = await res.json();

    const budget = data.budget || 0;
    const spent = data.spent || 0;
    const remaining = Math.max(budget - spent, 0);

    if (budgetAmountEl) budgetAmountEl.textContent = budget;
    if (budgetSpentEl) budgetSpentEl.textContent = spent;
    if (budgetRemainingEl) budgetRemainingEl.textContent = remaining;

    if (!budgetBarFill || !budgetStatusEl) return;

    const percent =
      budget > 0 ? (spent / budget) * 100 : 0;

    
    // Cap bar visually
budgetBarFill.style.width = Math.min(percent, 100) + "%";

// Default pastel green
budgetBarFill.style.background =
  "linear-gradient(90deg, #9AE6B4, #68D391)";

    //  CORRECT STATUS LOGIC
    if (percent < 70) {
      budgetBarFill.style.background =
        "linear-gradient(90deg, #B7E4C7, #95D5B2)";
      budgetStatusEl.textContent = "You’re on track";
      budgetStatusEl.style.color = "#166534";

    } else if (percent < 100) {
      budgetBarFill.style.background =
        "linear-gradient(90deg, #FDE68A, #FACC15)";
      budgetStatusEl.textContent = "Approaching budget limit";
      budgetStatusEl.style.color = "#92400e";

    }  else if (percent === 100) {
  budgetBarFill.style.background =
    "linear-gradient(90deg, #FDE68A, #FACC15)";
  budgetStatusEl.textContent = "Budget reached";
  budgetStatusEl.style.color = "#92400e";

} else {
      budgetBarFill.style.background =
        "linear-gradient(90deg, #FCA5A5, #EF4444)";
      budgetStatusEl.textContent = "Budget exceeded";
      budgetStatusEl.style.color = "#991b1b";
    }

  } catch (error) {
    console.error("Error loading budget:", error);
  }
}
    

async function setBudget() {
  const input = prompt("Enter monthly budget amount (₹)");
  if (!input) return;

  const amount = Number(input);
  if (isNaN(amount) || amount < 0) {
    alert("Please enter a valid positive number");
    return;
  }

  try {
    await fetch("http://localhost:5000/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });

    loadCurrentBudget();
  } catch (error) {
    console.error("Error saving budget:", error);
  }
}

// ==============================
// SMART INSIGHTS LOGIC
// ==============================

async function updateSmartInsights() {
  try {
    const res = await fetch("http://localhost:5000/expenses/monthly");
    const data = await res.json();

    if (!data || data.length === 0) {
      setEmptyInsights();
      return;
    }

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;

    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(
      prevMonthDate.getMonth() + 1
    ).padStart(2, "0")}`;

    const currentMonth = data.find(d => d.month === currentMonthKey);
    const prevMonth = data.find(d => d.month === prevMonthKey);

    const currentTotal = currentMonth ? currentMonth.totalSpent : 0;
    const prevTotal = prevMonth ? prevMonth.totalSpent : 0;

    // MONTHLY COMPARISON
    const diff = currentTotal - prevTotal;

    if (prevTotal === 0 && currentTotal === 0) {
  insightComparisonEl.textContent = "No spending data yet";
} else if (prevTotal === 0) {
  insightComparisonEl.textContent = "No previous month data";
}  else if (diff > 0) {
      insightComparisonEl.textContent = `₹${diff} more than last month`;
    } else if (diff < 0) {
      insightComparisonEl.textContent = `₹${Math.abs(diff)} less than last month`;
    } else {
      insightComparisonEl.textContent = "Same as last month";
    }

    //  AVERAGE DAILY SPEND (CURRENT MONTH)
    const dayTotals = {};
    expenses.forEach(exp => {
      const d = new Date(exp.date).toDateString();
      dayTotals[d] = (dayTotals[d] || 0) + exp.amount;
    });

    const daysCount = Object.keys(dayTotals).length;
    const visibleTotal = Object.values(dayTotals)
  .reduce((sum, val) => sum + val, 0);

const avg = daysCount > 0
  ? Math.round(visibleTotal / daysCount)
  : 0;

    insightAverageEl.textContent = `₹${avg} / day`;

    // MOST EXPENSIVE DAY
    let maxDay = null;
    let maxAmount = 0;

    Object.entries(dayTotals).forEach(([day, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        maxDay = day;
      }
    });

    if (maxDay) {
      const formatted = new Date(maxDay).toLocaleDateString("default", {
        day: "numeric",
        month: "short"
      });
      insightExpensiveDayEl.textContent = `${formatted} (₹${maxAmount})`;
    } else {
      insightExpensiveDayEl.textContent = "No data";
    }

  } catch (error) {
    console.error("Smart insights error:", error);
    setEmptyInsights();
  }
}

function setEmptyInsights() {
  if (insightComparisonEl) insightComparisonEl.textContent = "No data";
  if (insightAverageEl) insightAverageEl.textContent = "No data";
  if (insightExpensiveDayEl) insightExpensiveDayEl.textContent = "No data";
}


// ==============================
// HELPER
// ==============================

function formatMonth(monthStr) {
  const [year, month] = monthStr.split("-");
  return new Date(year, month - 1).toLocaleString("default", {
    month: "short",
    year: "numeric"
  });
}

function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("default", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// ==============================
// MONTHLY FORECAST (AI-LIKE LOGIC)
// ==============================

async function loadForecast() {
  try {
    const res = await fetch("http://localhost:5000/forecast");
    const data = await res.json();

    const amountEl = document.getElementById("forecastAmount");
    const messageEl = document.getElementById("forecastMessage");

    if (!amountEl || !messageEl) return;

    amountEl.textContent = `₹${data.forecast}`;
    messageEl.textContent = data.message;

  } catch (err) {
    console.error("Forecast fetch error:", err);
  }
}

// ================= DARK MODE TOGGLE =================

// Get the button
const toggleBtn = document.getElementById("darkModeToggle");

// When button is clicked
toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
});


