// ==============================
// GLOBAL STATE
// ==============================

let expenses = [];
let analysisExpenses = [];
let expenseChart = null;
let barChart = null;
let monthlyChart = null;
let monthlyCategoryChart = null;
let editingExpenseId = null;

const API_BASE_URL =
  (
    window.SMART_EXPENSE_CONFIG?.API_BASE_URL ||
    window.SMART_EXPENSE_API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
const TOKEN_KEY = "expenseTrackerToken";
const EXPENSE_CATEGORIES = [
  "Home",
  "Food & Groceries",
  "Utilities & Bills",
  "Transport",
  "Healthcare",
  "Education",
  "Entertainment",
  "Personal Care",
  "Shopping",
  "Miscellaneous"
];

// ==============================
// DOM ELEMENTS
// ==============================

const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const subcategoryInput = document.getElementById("subcategory");
const essentialCheck = document.getElementById("essentialCheck");
const nonEssentialCheck = document.getElementById("nonEssentialCheck");
const dateInput = document.getElementById("date");
const expenseList = document.getElementById("expenseList");
const totalEl = document.getElementById("total");

const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");
const historyLabel = document.getElementById("historyLabel");
const analysisModeInput = document.getElementById("analysisMode");
const analysisDateInput = document.getElementById("analysisDate");
const analysisMonthInput = document.getElementById("analysisMonth");
const analysisDateControl = document.getElementById("analysisDateControl");
const analysisMonthControl = document.getElementById("analysisMonthControl");
const analysisLabel = document.getElementById("analysisLabel");

const authPage = document.getElementById("authPage");
const dashboardPage = document.getElementById("dashboardPage");
const loginView = document.getElementById("loginView");
const signupView = document.getElementById("signupView");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const signupNameInput = document.getElementById("signupName");
const signupEmailInput = document.getElementById("signupEmail");
const signupPasswordInput = document.getElementById("signupPassword");
const loginBtn = document.getElementById("loginBtn");
const signupBtn = document.getElementById("signupBtn");
const showSignupBtn = document.getElementById("showSignupBtn");
const showLoginBtn = document.getElementById("showLoginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginMessage = document.getElementById("loginMessage");
const signupMessage = document.getElementById("signupMessage");

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

const insightTopCategoryEl = document.getElementById("insightTopCategory");
const insightMonthlyTrendEl = document.getElementById("insightMonthlyTrend");
const insightBudgetWarningEl = document.getElementById("insightBudgetWarning");
const insightSavingsEl = document.getElementById("insightSavings");
const insightPatternEl = document.getElementById("insightPattern");

// ==============================
// FORECAST DOM ELEMENTS
// ==============================

const forecastAmountEl = document.getElementById("forecastAmount");
const forecastMessageEl = document.getElementById("forecastMessage");
const forecastAverageDailyEl = document.getElementById("forecastAverageDaily");
const forecastRemainingBudgetEl = document.getElementById("forecastRemainingBudget");
const forecastExplanationEl = document.getElementById("forecastExplanation");

// ==============================
// APP SHELL DOM ELEMENTS
// ==============================

const pageTitleEl = document.getElementById("pageTitle");
const pageViews = document.querySelectorAll(".page-view");
const sidebarLinks = document.querySelectorAll(".sidebar-link");
const appStatusEl = document.getElementById("appStatus");
const loadingStateEl = document.getElementById("loadingState");
const dashboardRemainingBudgetEl = document.getElementById("dashboardRemainingBudget");
const dashboardRecentExpensesEl = document.getElementById("dashboardRecentExpenses");
const dashboardTopInsightEl = document.getElementById("dashboardTopInsight");
const dashboardForecastSummaryEl = document.getElementById("dashboardForecastSummary");
const reportStatusEl = document.getElementById("reportStatus");
const toastContainer = document.getElementById("toastContainer");
const profileMenuBtn = document.getElementById("profileMenuBtn");
const profileMenu = document.getElementById("profileMenu");
const sidebarThemeToggle = document.getElementById("sidebarDarkModeToggle");

// ==============================
// AUTH HELPERS
// ==============================

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function showAuth(view = "login") {
  authPage.classList.remove("hidden");
  dashboardPage.classList.add("hidden");
  setLoading(false);
  showStatus("");

  if (view === "signup") {
    signupView.classList.remove("hidden");
    loginView.classList.add("hidden");
  } else {
    loginView.classList.remove("hidden");
    signupView.classList.add("hidden");
  }
}

function showDashboard() {
  authPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
  setActiveView("dashboard");
  initializeDateFilters();
  fetchExpensesByRange();
}

function setActiveView(viewName) {
  pageViews.forEach(view => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });

  sidebarLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.view === viewName);
  });

  const activeView = document.getElementById(`view-${viewName}`);
  if (pageTitleEl && activeView) {
    pageTitleEl.textContent = activeView.dataset.title || "Dashboard";
  }

  setTimeout(() => {
    if (expenseChart) expenseChart.resize();
    if (barChart) barChart.resize();
    if (monthlyChart) monthlyChart.resize();
    if (monthlyCategoryChart) monthlyCategoryChart.resize();
    renderIcons();
  }, 50);
}

function setLoading(isLoading, message = "Loading your finance data...") {
  if (!loadingStateEl) return;

  loadingStateEl.classList.toggle("hidden", !isLoading);
  const textEl = loadingStateEl.querySelector("p");
  if (textEl) textEl.textContent = message;
}

function createToast(message, type = "info") {
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4200);
}

function showStatus(message, type = "info") {
  if (!message) {
    if (appStatusEl) appStatusEl.className = "app-status hidden";
    return;
  }

  if (appStatusEl) {
    appStatusEl.textContent = message;
    appStatusEl.className = `app-status ${type}`;
  }

  createToast(message, type);
}

function formatCurrency(amount) {
  return `\u20B9${Math.round(Number(amount) || 0).toLocaleString("en-IN")}`;
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthDateRange(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function formatDisplayText(value, fallback = "Not specified") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return text
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (res.status === 401) {
    clearToken();
    showAuth("login");
    throw new Error("Session expired");
  }

  return res;
}

async function login() {
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;

  if (!email || !password) {
    loginMessage.textContent = "Email and password are required";
    return;
  }

  try {
    loginMessage.textContent = "Signing you in...";
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      loginMessage.textContent = data.message || "Login failed";
      return;
    }

    setToken(data.token);
    loginMessage.textContent = "";
    loginPasswordInput.value = "";
    showDashboard();
  } catch (error) {
    loginMessage.textContent = "Unable to login right now";
    console.error("Login error:", error);
  }
}

async function signup() {
  const name = signupNameInput.value.trim();
  const email = signupEmailInput.value.trim();
  const password = signupPasswordInput.value;

  if (!name || !email || !password) {
    signupMessage.textContent = "Name, email and password are required";
    return;
  }

  try {
    signupMessage.textContent = "Creating your account...";
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      signupMessage.textContent = data.message || "Signup failed";
      return;
    }

    signupMessage.textContent = "Account created. Please login.";
    signupNameInput.value = "";
    signupEmailInput.value = "";
    signupPasswordInput.value = "";
    showAuth("login");
  } catch (error) {
    signupMessage.textContent = "Unable to signup right now";
    console.error("Signup error:", error);
  }
}

function logout() {
  clearToken();
  expenses = [];
  showAuth("login");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getExpenseTypeLabel(expense) {
  return expense.isEssential === false ? "Non-essential" : "Essential";
}

function getExpenseTypeClass(expense) {
  return expense.isEssential === false ? "non-essential" : "essential";
}

function getSelectedExpenseType() {
  return nonEssentialCheck?.checked ? false : true;
}


// ==============================
// FETCH TODAY'S EXPENSES ON LOAD
// ==============================

async function fetchTodayExpenses() {
  try {
    setLoading(true, "Loading today's expenses...");
    const res = await authFetch("/expenses/today");
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to load today's expenses");
    }

    expenses = await res.json();

    historyLabel.textContent = "Showing: Today";
    refreshUI();
  } catch (error) {
    console.error("Error fetching today's expenses:", error);
    showStatus("Unable to load today's expenses. Please try again.", "error");
  } finally {
    setLoading(false);
  }
}

// ==============================
// FETCH EXPENSES BY DATE
// ==============================

async function fetchExpensesByDate(date) {
  try {
    setLoading(true, "Loading expenses for the selected date...");
    const res = await authFetch(`/expenses/by-date?date=${date}`);

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to load expenses");
    }

    expenses = await res.json();

    historyLabel.textContent = "Showing: " + formatFullDate(date);
    refreshUI();
  } catch (error) {
    console.error("Error fetching expenses by date:", error);
    showStatus("Unable to load expenses for that date.", "error");
  } finally {
    setLoading(false);
  }
}

// ==============================
// DATE RANGE FILTERS
// ==============================

function initializeDateFilters() {
  const today = getTodayInputValue();
  if (fromDateInput && !fromDateInput.value) fromDateInput.value = today;
  if (toDateInput && !toDateInput.value) toDateInput.value = today;
  if (dateInput && !dateInput.value) dateInput.value = today;
  if (analysisDateInput && !analysisDateInput.value) analysisDateInput.value = today;
  if (analysisMonthInput && !analysisMonthInput.value) analysisMonthInput.value = getCurrentMonthInputValue();
}

async function fetchExpensesByRange() {
  initializeDateFilters();

  const from = fromDateInput?.value || getTodayInputValue();
  const to = toDateInput?.value || from;

  if (from > to) {
    showStatus("From date cannot be after the to date.", "error");
    return;
  }

  try {
    setLoading(true, "Loading expenses for the selected range...");
    const res = await authFetch(`/expenses/range?from=${from}&to=${to}`);

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to load expense history");
    }

    expenses = await res.json();
    historyLabel.textContent = from === to
      ? `Showing: ${formatFullDate(from)}`
      : `Showing: ${formatFullDate(from)} to ${formatFullDate(to)}`;
    refreshUI();
  } catch (error) {
    console.error("Error fetching expenses by range:", error);
    showStatus("Unable to load expenses for that date range.", "error");
  } finally {
    setLoading(false);
  }
}

if (fromDateInput && toDateInput) {
  fromDateInput.addEventListener("change", fetchExpensesByRange);
  toDateInput.addEventListener("change", fetchExpensesByRange);
}

function syncAnalysisControls() {
  const mode = analysisModeInput?.value || "date";
  analysisDateControl?.classList.toggle("hidden", mode !== "date");
  analysisMonthControl?.classList.toggle("hidden", mode !== "month");
}

async function loadAnalysisExpenses() {
  initializeDateFilters();
  syncAnalysisControls();

  const mode = analysisModeInput?.value || "date";
  let from = analysisDateInput?.value || getTodayInputValue();
  let to = from;
  let label = `Showing spending for ${formatFullDate(from)}`;

  if (mode === "month") {
    const monthValue = analysisMonthInput?.value || getCurrentMonthInputValue();
    const range = getMonthDateRange(monthValue);
    from = range.start;
    to = range.end;
    label = `Showing spending for ${formatMonth(monthValue)}`;
  }

  try {
    const res = await authFetch(`/expenses/range?from=${from}&to=${to}`);

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to load analysis data");
    }

    analysisExpenses = await res.json();
    if (analysisLabel) analysisLabel.textContent = label;
    updatePieChart();
    updateBarChart();
  } catch (error) {
    console.error("Analysis chart error:", error);
    showStatus("Unable to load spending overview for that selection.", "error");
  }
}

if (analysisModeInput) {
  analysisModeInput.addEventListener("change", loadAnalysisExpenses);
}

if (analysisDateInput) {
  analysisDateInput.addEventListener("change", loadAnalysisExpenses);
}

if (analysisMonthInput) {
  analysisMonthInput.addEventListener("change", loadAnalysisExpenses);
}

bindExclusiveChecks(essentialCheck, nonEssentialCheck);

// ==============================
// ADD EXPENSE
// ==============================

async function addExpense() {
  const amount = amountInput.value;
  const category = categoryInput.value;
  const subcategory = subcategoryInput.value.trim();
  const isEssential = getSelectedExpenseType();
  const date = dateInput.value;

  if (!amount || !category) {
    showStatus("Please enter an amount and category before adding an expense.", "error");
    return;
  }

  try {
    setLoading(true, "Saving expense...");
    const res = await authFetch("/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        category,
        subcategory,
        isEssential,
        date
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to add expense");
    }

    await fetchExpensesByRange();

    amountInput.value = "";
    categoryInput.value = "Home";
    subcategoryInput.value = "";
    if (essentialCheck) essentialCheck.checked = true;
    if (nonEssentialCheck) nonEssentialCheck.checked = false;
    dateInput.value = "";
    showStatus("Expense added successfully.", "success");

  } catch (error) {
    console.error("Error adding expense:", error);
    showStatus("Unable to add the expense right now.", "error");
  } finally {
    setLoading(false);
  }
}

// ==============================
// DELETE EXPENSE
// ==============================

async function deleteExpense(id) {
  try {
    setLoading(true, "Deleting expense...");
    const res = await authFetch(`/expenses/${id}`, {
      method: "DELETE"
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to delete expense");
    }

    expenses = expenses.filter(exp => exp._id !== id);
    refreshUI();
    showStatus("Expense deleted.", "success");
  } catch (error) {
    console.error("Error deleting expense:", error);
    showStatus("Unable to delete that expense.", "error");
  } finally {
    setLoading(false);
  }
}

// ==============================
// EDIT EXPENSE
// ==============================

function startEditExpense(id) {
  editingExpenseId = id;
  renderExpenses();
}

function cancelEditExpense() {
  editingExpenseId = null;
  renderExpenses();
}

async function updateExpense(id) {
  const amount = document.getElementById(`editAmount-${id}`).value;
  const category = document.getElementById(`editCategory-${id}`).value;
  const subcategory = document.getElementById(`editSubcategory-${id}`).value.trim();
  const isEssential = document.getElementById(`editEssential-${id}`).checked;
  const date = document.getElementById(`editDate-${id}`).value;

  if (!amount || !category) {
    showStatus("Please enter an amount and category before saving.", "error");
    return;
  }

  try {
    setLoading(true, "Updating expense...");
    const res = await authFetch(`/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        category,
        subcategory,
        isEssential,
        date
      })
    });

    const data = await res.json();

    if (!res.ok) {
      showStatus(data.message || "Failed to update expense.", "error");
      return;
    }

    editingExpenseId = null;

    await fetchExpensesByRange();
    showStatus("Expense updated successfully.", "success");
  } catch (error) {
    console.error("Error updating expense:", error);
    showStatus("Unable to update that expense.", "error");
  } finally {
    setLoading(false);
  }
}

// ==============================
// UI REFRESH
// ==============================

function refreshUI() {
  renderExpenses();
  renderDashboardRecentExpenses();
  updateTotal();
  loadAnalysisExpenses();
  updateTopCategory();
  loadMonthlyTrend();
  loadCurrentBudget();
  updateAiInsights();
  loadForecast();
}

// ==============================
// RENDER EXPENSE LIST
// ==============================

function renderExpenses() {
  expenseList.innerHTML = "";

  if (expenses.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No expenses found for this view. Add one to start tracking.";
    expenseList.appendChild(empty);
    renderIcons();
    return;
  }

  expenses.forEach(exp => {
    const li = document.createElement("li");
    const inputDate = new Date(exp.date).toISOString().split("T")[0];

    if (editingExpenseId === exp._id) {
      li.classList.add("editing-expense");
      li.innerHTML = `
        <input type="number" id="editAmount-${exp._id}" value="${exp.amount}" />
        ${getCategorySelectMarkup(`editCategory-${exp._id}`, exp.category)}
        <input type="text" id="editSubcategory-${exp._id}" value="${escapeHtml(exp.subcategory || "")}" placeholder="Subcategory" />
        <input type="date" id="editDate-${exp._id}" value="${inputDate}" />
        <div class="edit-type-controls">
          <label class="check-option">
            <input type="checkbox" id="editEssential-${exp._id}" ${exp.isEssential === false ? "" : "checked"} />
            <span>Essential</span>
          </label>
          <label class="check-option">
            <input type="checkbox" id="editNonEssential-${exp._id}" ${exp.isEssential === false ? "checked" : ""} />
            <span>Non-essential</span>
          </label>
        </div>
        <div class="expense-actions">
          <button class="save-btn"><i data-lucide="check"></i>Save</button>
          <button class="cancel-btn"><i data-lucide="x"></i>Cancel</button>
        </div>
      `;

      bindExclusiveChecks(
        document.getElementById(`editEssential-${exp._id}`),
        document.getElementById(`editNonEssential-${exp._id}`)
      );

      li.querySelector(".save-btn").addEventListener("click", () => {
        updateExpense(exp._id);
      });

      li.querySelector(".cancel-btn").addEventListener("click", () => {
        cancelEditExpense();
      });

      expenseList.appendChild(li);
      renderIcons();
      return;
    }

    const dateText = new Date(exp.date).toLocaleDateString("default", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    li.innerHTML = `
      <span>${formatCurrency(exp.amount)}</span>
      <span class="tag">${escapeHtml(formatDisplayText(exp.category))}</span>
      <span class="expense-subcategory">${escapeHtml(formatDisplayText(exp.subcategory))}</span>
      <span class="type-badge ${getExpenseTypeClass(exp)}">${getExpenseTypeLabel(exp)}</span>
      <span class="expense-date">${dateText}</span>
      <div class="expense-actions">
        <button class="edit-btn"><i data-lucide="pencil"></i>Edit</button>
        <button class="delete-btn" aria-label="Delete expense"><i data-lucide="trash-2"></i></button>
      </div>
    `;

    li.querySelector(".edit-btn").addEventListener("click", () => {
      startEditExpense(exp._id);
    });

    li.querySelector(".delete-btn").addEventListener("click", () => {
      deleteExpense(exp._id);
    });

    expenseList.appendChild(li);
  });

  renderIcons();
}

function renderDashboardRecentExpenses() {
  if (!dashboardRecentExpensesEl) return;

  dashboardRecentExpensesEl.innerHTML = "";

  if (expenses.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "No recent expenses yet.";
    dashboardRecentExpensesEl.appendChild(empty);
    renderIcons();
    return;
  }

  expenses.slice(0, 5).forEach(exp => {
    const item = document.createElement("li");
    const dateText = new Date(exp.date).toLocaleDateString("default", {
      day: "numeric",
      month: "short"
    });

    item.innerHTML = `
      <div>
        <strong>${escapeHtml(formatDisplayText(exp.category))}</strong>
        <span>${exp.subcategory ? `${escapeHtml(formatDisplayText(exp.subcategory))} - ` : ""}${getExpenseTypeLabel(exp)} - ${dateText}</span>
      </div>
      <strong>${formatCurrency(exp.amount)}</strong>
    `;
    dashboardRecentExpensesEl.appendChild(item);
  });

  renderIcons();
}

function getCategorySelectMarkup(id, selectedCategory = "Home") {
  const categories = EXPENSE_CATEGORIES.includes(selectedCategory)
    ? EXPENSE_CATEGORIES
    : [selectedCategory, ...EXPENSE_CATEGORIES];

  const options = categories.map(category => {
    const selected = category === selectedCategory ? "selected" : "";
    return `<option value="${escapeHtml(category)}" ${selected}>${escapeHtml(category)}</option>`;
  }).join("");

  return `<select id="${id}">${options}</select>`;
}

function bindExclusiveChecks(essentialEl, nonEssentialEl) {
  if (!essentialEl || !nonEssentialEl) return;

  essentialEl.addEventListener("change", () => {
    if (essentialEl.checked) {
      nonEssentialEl.checked = false;
    } else {
      nonEssentialEl.checked = true;
    }
  });

  nonEssentialEl.addEventListener("change", () => {
    if (nonEssentialEl.checked) {
      essentialEl.checked = false;
    } else {
      essentialEl.checked = true;
    }
  });
}

// ==============================
// TOTAL SPENT
// ==============================

function updateTotal() {
  const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  totalEl.textContent = formatCurrency(total);
}

// ==============================
// PIE CHART 
// ==============================

function updatePieChart() {
  const canvas = document.getElementById("expenseChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  const categoryTotals = {};
  analysisExpenses.forEach(exp => {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + Number(exp.amount);
  });

  const entries = Object.entries(categoryTotals);
  const labels = entries.map(([category]) => formatDisplayText(category));
  const data = entries.map(([, amount]) => amount);

  if (data.length === 0) {
    if (expenseChart) expenseChart.destroy();
    return;
  }

  const colors = [
    "#0f766e",
    "#2563eb",
    "#d97706",
    "#7c3aed",
    "#16a34a",
    "#dc2626",
    "#0891b2"
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
          align: "center",
          labels: {
            padding: 16,
            boxWidth: 12,
            usePointStyle: true,
            color: "#475467",
            font: {
              family: "Inter",
              size: 13,
              weight: "600"
            }
          }
        },
        tooltip: {
          backgroundColor: "rgba(63, 58, 54, 0.92)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          padding: 14,
          cornerRadius: 12,
          callbacks: {
            label(context) {
              const value = context.raw;
              const total = data.reduce((a, b) => a + b, 0);
              const percent = ((value / total) * 100).toFixed(1);
              return `\u20B9${value} - ${percent}%`;
            }
          }
        }
      },
      layout: {
        padding: 16
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
  analysisExpenses.forEach(exp => {
    categoryTotals[exp.category] =
      (categoryTotals[exp.category] || 0) + Number(exp.amount);
  });

  const entries = Object.entries(categoryTotals);
  const labels = entries.map(([category]) => formatDisplayText(category));
  const data = entries.map(([, amount]) => amount);

  if (labels.length === 0) {
    if (barChart) barChart.destroy();
    return;
  }

  // Warm pastel gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 350);
  gradient.addColorStop(0, "#0f766e");
  gradient.addColorStop(1, "#2563eb");

  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Spending (\u20B9)",
        data,
        backgroundColor: gradient,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 36
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(63, 58, 54, 0.92)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          padding: 14,
          cornerRadius: 12,
          callbacks: {
            label: ctx => `\u20B9${ctx.raw}`
          }
        }
      },
      layout: {
        padding: 16
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#667085",
            font: { size: 12, weight: "600" }
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(228, 231, 236, 0.9)" },
          ticks: {
            color: "#667085",
            callback: v => `\u20B9${v}`,
            font: { size: 12 }
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
  el.textContent = `${formatDisplayText(top[0])} (${formatCurrency(top[1])})`;
}

// ==============================
// MONTHLY TREND AND CATEGORY ANALYSIS
// ==============================

async function loadMonthlyTrend() {
  try {
    const [expensesRes, budgetsRes] = await Promise.all([
      authFetch("/expenses/monthly"),
      authFetch("/budget/monthly")
    ]);
    const data = await expensesRes.json();
    const budgetData = await budgetsRes.json();

    if (!data || data.length === 0) {
      if (monthlyChart) monthlyChart.destroy();
      if (monthlyCategoryChart) monthlyCategoryChart.destroy();
      return;
    }

    renderMonthlyCategoryChart(data);

    const latestMonths = getLatestThreeMonthKeys(data, budgetData);
    const labels = latestMonths.map(formatMonth);
    const expenseTotalsByMonth = Object.fromEntries(
      data.map(month => [month.month, Number(month.totalSpent) || 0])
    );
    const budgetByMonth = Object.fromEntries(
      (budgetData || []).map(budget => [budget.month, Number(budget.amount) || 0])
    );
    const expenseTotals = latestMonths.map(month => expenseTotalsByMonth[month] || 0);
    const budgetTotals = latestMonths.map(month => budgetByMonth[month] || 0);

    const canvas = document.getElementById("monthlyChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    if (monthlyChart) monthlyChart.destroy();

    monthlyChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Budget",
            data: budgetTotals,
            backgroundColor: "rgba(29, 78, 216, 0.82)",
            borderColor: "rgba(29, 78, 216, 1)",
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false
          },
          {
            label: "Expenses",
            data: expenseTotals,
            backgroundColor: "rgba(15, 118, 110, 0.86)",
            borderColor: "rgba(15, 118, 110, 1)",
            borderWidth: 1,
            borderRadius: 8,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1000,
          easing: "easeOutQuart"
        },
        plugins: {
          legend: getChartLegendConfig(),
          tooltip: {
            backgroundColor: "rgba(17, 24, 39, 0.94)",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            padding: 14,
            cornerRadius: 12,
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
            }
          }
        },
        layout: {
          padding: 16
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: "rgba(228, 231, 236, 0.9)" },
            ticks: {
              ...getChartTickConfig(),
              callback: value => formatCurrency(value)
            }
          },
          x: {
            grid: { display: false },
            ticks: getChartTickConfig()
          }
        }
      }
    });

  } catch (err) {
    console.error("Monthly trend error:", err);
  }
}

function renderMonthlyCategoryChart(monthlyData) {
  const canvas = document.getElementById("monthlyCategoryChart");
  if (!canvas) return;

  const recentMonths = monthlyData.slice(-3).map(normalizeMonthlyCategoryData);
  const categories = EXPENSE_CATEGORIES.filter(category =>
    recentMonths.some(month => Number(month.byCategory?.[category] || 0) > 0)
  );
  const labels = recentMonths.map(month => formatMonth(month.month));

  if (categories.length === 0) {
    if (monthlyCategoryChart) monthlyCategoryChart.destroy();
    return;
  }

  const datasets = categories.map((category, index) => ({
    label: formatDisplayText(category),
    data: recentMonths.map(month => Number(month.byCategory?.[category] || 0)),
    backgroundColor: getChartColor(index, 0.86),
    borderColor: getChartColor(index, 1),
    borderWidth: 1,
    borderRadius: 6,
    borderSkipped: false
  }));

  if (monthlyCategoryChart) monthlyCategoryChart.destroy();

  monthlyCategoryChart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: getChartLegendConfig(),
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.94)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          padding: 14,
          cornerRadius: 10,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: getChartTickConfig()
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(228, 231, 236, 0.9)" },
          ticks: {
            ...getChartTickConfig(),
            callback: value => formatCurrency(value)
          }
        }
      }
    }
  });
}

function getLatestThreeMonthKeys(expenseMonths, budgetMonths) {
  const keys = new Set();
  (expenseMonths || []).forEach(month => keys.add(month.month));
  (budgetMonths || []).forEach(month => keys.add(month.month));

  const sortedKeys = Array.from(keys).filter(Boolean).sort();
  if (sortedKeys.length >= 3) {
    return sortedKeys.slice(-3);
  }

  const now = new Date();
  const fallbackKeys = [];
  for (let offset = 2; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    fallbackKeys.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return Array.from(new Set([...fallbackKeys, ...sortedKeys])).sort().slice(-3);
}

function normalizeMonthlyCategoryData(month) {
  const byCategory = {};

  EXPENSE_CATEGORIES.forEach(category => {
    byCategory[category] = 0;
  });

  Object.entries(month.byCategory || {}).forEach(([category, amount]) => {
    const mainCategory = EXPENSE_CATEGORIES.includes(category)
      ? category
      : "Miscellaneous";
    byCategory[mainCategory] += Number(amount) || 0;
  });

  return {
    ...month,
    byCategory
  };
}

function getMonthlyCategories(monthlyData) {
  const categories = new Set();
  monthlyData.forEach(month => {
    Object.keys(month.byCategory || {}).forEach(category => categories.add(category));
  });
  return Array.from(categories).sort((a, b) => a.localeCompare(b));
}

function getChartColor(index, alpha = 1) {
  const palette = [
    [15, 118, 110],
    [29, 78, 216],
    [217, 119, 6],
    [124, 58, 237],
    [22, 163, 74],
    [220, 38, 38],
    [8, 145, 178],
    [190, 24, 93]
  ];
  const [r, g, b] = palette[index % palette.length];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getChartTickConfig() {
  return {
    color: "#667085",
    font: {
      family: "Inter",
      size: 12,
      weight: "600"
    }
  };
}

function getChartLegendConfig() {
  return {
    position: "bottom",
    labels: {
      boxWidth: 10,
      padding: 16,
      usePointStyle: true,
      color: "#475467",
      font: {
        family: "Inter",
        size: 12,
        weight: "600"
      }
    }
  };
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
    const res = await authFetch("/budget/current");
    const data = await res.json();

    const budget = data.budget || 0;
    const spent = data.spent || 0;
    const remaining = Math.max(budget - spent, 0);

    if (budgetAmountEl) budgetAmountEl.textContent = budget;
    if (budgetSpentEl) budgetSpentEl.textContent = spent;
    if (budgetRemainingEl) budgetRemainingEl.textContent = remaining;
    if (dashboardRemainingBudgetEl) dashboardRemainingBudgetEl.textContent = Math.round(remaining).toLocaleString("en-IN");

    if (!budgetBarFill || !budgetStatusEl) return;

    const percent =
      budget > 0 ? (spent / budget) * 100 : 0;

    
    // Cap bar visually
budgetBarFill.style.width = Math.min(percent, 100) + "%";

// Default pastel green
budgetBarFill.style.background =
  "linear-gradient(90deg, #0f766e, #2563eb)";

    //  CORRECT STATUS LOGIC
    if (percent < 70) {
      budgetBarFill.style.background =
        "linear-gradient(90deg, #0f766e, #2563eb)";
      budgetStatusEl.textContent = "You're on track";
      budgetStatusEl.style.color = "#0f766e";

    } else if (percent < 100) {
      budgetBarFill.style.background =
        "linear-gradient(90deg, #d97706, #f59e0b)";
      budgetStatusEl.textContent = "Approaching budget limit";
      budgetStatusEl.style.color = "#d97706";

    }  else if (percent === 100) {
  budgetBarFill.style.background =
    "linear-gradient(90deg, #d97706, #f59e0b)";
  budgetStatusEl.textContent = "Budget reached";
  budgetStatusEl.style.color = "#d97706";

} else {
      budgetBarFill.style.background =
        "linear-gradient(90deg, #dc2626, #d97706)";
      budgetStatusEl.textContent = "Budget exceeded";
      budgetStatusEl.style.color = "#dc2626";
    }

  } catch (error) {
    console.error("Error loading budget:", error);
  }
}
    

// ==============================
// EXPORT MONTHLY REPORT
// ==============================

async function exportMonthlyReport() {
  try {
    setLoading(true, "Preparing your PDF report...");
    if (reportStatusEl) reportStatusEl.textContent = "Preparing your report...";
    const res = await authFetch("/report/monthly");

    if (!res.ok) {
      const data = await res.json();
      const message = data.message || "Failed to export report.";
      if (reportStatusEl) reportStatusEl.textContent = message;
      showStatus(message, "error");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    link.href = url;
    link.download = `monthly-finance-report-${month}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    if (reportStatusEl) reportStatusEl.textContent = "Report downloaded successfully.";
    showStatus("Report downloaded successfully.", "success");
  } catch (error) {
    console.error("Report export error:", error);
    if (reportStatusEl) reportStatusEl.textContent = "Unable to export report right now.";
    showStatus("Unable to export report right now.", "error");
  } finally {
    setLoading(false);
  }
}

// ==============================
// SMART INSIGHTS LOGIC
// ==============================

async function updateAiInsights() {
  try {
    const [expensesRes, monthlyRes, budgetRes] = await Promise.all([
      authFetch("/expenses"),
      authFetch("/expenses/monthly"),
      authFetch("/budget/current")
    ]);
    const allExpenses = await expensesRes.json();
    const monthlyData = await monthlyRes.json();
    const budgetData = await budgetRes.json();

    if (!allExpenses || allExpenses.length === 0) {
      setEmptyAiInsights();
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
    const currentMonth = monthlyData.find(d => d.month === currentMonthKey);
    const prevMonth = monthlyData.find(d => d.month === prevMonthKey);
    const currentTotal = currentMonth ? currentMonth.totalSpent : 0;
    const prevTotal = prevMonth ? prevMonth.totalSpent : 0;
    const currentMonthExpenses = allExpenses.filter(exp => {
      const expDate = new Date(exp.date);
      return (
        expDate.getFullYear() === now.getFullYear() &&
        expDate.getMonth() === now.getMonth()
      );
    });

    updateHighestCategoryInsight(currentMonthExpenses, currentTotal);
    updateMonthlyTrendInsight(currentTotal, prevTotal);
    updateBudgetWarningInsight(currentTotal, budgetData.budget || 0);
    updateSavingsInsight(currentMonthExpenses);
    updatePatternInsight(allExpenses);
    if (dashboardTopInsightEl && insightTopCategoryEl) {
      dashboardTopInsightEl.textContent = insightTopCategoryEl.textContent;
    }
  } catch (error) {
    console.error("AI insights error:", error);
    setEmptyAiInsights();
  }
}

function updateHighestCategoryInsight(currentMonthExpenses, currentTotal) {
  if (!currentMonthExpenses.length || currentTotal === 0) {
    insightTopCategoryEl.textContent = "No spending data for this month yet.";
    return;
  }

  const totals = getCategoryTotals(currentMonthExpenses);
  const [category, amount] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  const percent = Math.round((amount / currentTotal) * 100);
  insightTopCategoryEl.textContent =
    `${category} accounts for ${percent}% of your spending this month.`;
}

function updateMonthlyTrendInsight(currentTotal, prevTotal) {
  if (prevTotal === 0 && currentTotal === 0) {
    insightMonthlyTrendEl.textContent = "No monthly spending trend is available yet.";
    return;
  }

  if (prevTotal === 0) {
    insightMonthlyTrendEl.textContent =
      "This is your first month with spending data to compare.";
    return;
  }

  const percent = Math.round(((currentTotal - prevTotal) / prevTotal) * 100);

  if (percent > 0) {
    insightMonthlyTrendEl.textContent =
      `Spending increased by ${percent}% compared to last month.`;
  } else if (percent < 0) {
    insightMonthlyTrendEl.textContent =
      `Spending decreased by ${Math.abs(percent)}% compared to last month.`;
  } else {
    insightMonthlyTrendEl.textContent =
      "Spending is unchanged compared to last month.";
  }
}

function updateBudgetWarningInsight(currentTotal, budget) {
  if (!budget) {
    insightBudgetWarningEl.textContent =
      "Set a monthly budget to unlock budget warnings.";
    return;
  }

  const now = new Date();
  const daysPassed = now.getDate();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const forecast = Math.round((currentTotal / daysPassed) * totalDays);
  const projectedDifference = forecast - budget;

  if (projectedDifference > 0) {
    insightBudgetWarningEl.textContent =
      `At the current pace, you may exceed your budget by ${formatCurrency(projectedDifference)}.`;
  } else {
    insightBudgetWarningEl.textContent =
      `At the current pace, you may stay ${formatCurrency(Math.abs(projectedDifference))} under budget.`;
  }
}

function updateSavingsInsight(currentMonthExpenses) {
  if (!currentMonthExpenses.length) {
    insightSavingsEl.textContent = "Add expenses to see savings recommendations.";
    return;
  }

  const totals = getCategoryTotals(currentMonthExpenses);
  const [category, amount] = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  const categoryExpenses = currentMonthExpenses.filter(exp => exp.category === category);
  const averageSpend = Math.round(amount / categoryExpenses.length);

  insightSavingsEl.textContent =
    `Skipping one average ${category} expense could save approximately ${formatCurrency(averageSpend)} this month.`;
}

function updatePatternInsight(allExpenses) {
  const dayTypeSpend = {
    weekday: 0,
    weekend: 0
  };

  allExpenses.forEach(exp => {
    const day = new Date(exp.date).getDay();
    const type = day === 0 || day === 6 ? "weekend" : "weekday";
    dayTypeSpend[type] += Number(exp.amount);
  });

  if (dayTypeSpend.weekend > dayTypeSpend.weekday) {
    insightPatternEl.textContent = "Most spending occurs during weekends.";
  } else if (dayTypeSpend.weekday > dayTypeSpend.weekend) {
    insightPatternEl.textContent = "Most spending occurs during weekdays.";
  } else {
    insightPatternEl.textContent =
      "Spending is evenly split between weekdays and weekends.";
  }
}

function getCategoryTotals(expenseItems) {
  return expenseItems.reduce((totals, exp) => {
    totals[exp.category] = (totals[exp.category] || 0) + Number(exp.amount);
    return totals;
  }, {});
}

function setEmptyAiInsights() {
  if (insightTopCategoryEl) insightTopCategoryEl.textContent = "No spending data yet.";
  if (insightMonthlyTrendEl) insightMonthlyTrendEl.textContent = "No monthly trend yet.";
  if (insightBudgetWarningEl) insightBudgetWarningEl.textContent = "No budget warning yet.";
  if (insightSavingsEl) insightSavingsEl.textContent = "No savings recommendation yet.";
  if (insightPatternEl) insightPatternEl.textContent = "No spending pattern yet.";
  if (dashboardTopInsightEl) dashboardTopInsightEl.textContent = "No spending insights yet. Add expenses to unlock analysis.";
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
    const res = await authFetch("/forecast");
    const data = await res.json();

    if (forecastAmountEl) {
      forecastAmountEl.textContent = formatCurrency(data.projectedMonthEndSpending || 0);
    }

    if (forecastMessageEl) {
      forecastMessageEl.textContent = data.message || "Forecast is ready.";
    }

    if (dashboardForecastSummaryEl) {
      dashboardForecastSummaryEl.textContent = data.projectedMonthEndSpending
        ? formatCurrency(data.projectedMonthEndSpending)
        : "No forecast yet";
    }

    if (forecastAverageDailyEl) {
      forecastAverageDailyEl.textContent = formatCurrency(data.averageDailySpending || 0);
    }

    if (forecastRemainingBudgetEl) {
      forecastRemainingBudgetEl.textContent = formatCurrency(data.remainingBudget || 0);
    }

    if (forecastExplanationEl) {
      forecastExplanationEl.textContent = data.explanation || "";
    }
  } catch (err) {
    console.error("Forecast fetch error:", err);
    if (dashboardForecastSummaryEl) dashboardForecastSummaryEl.textContent = "Forecast unavailable";
    showStatus("Unable to load forecast insights.", "error");
  }
}

async function setBudget() {
  const input = prompt("Enter monthly budget amount (\u20B9)");
  if (!input) return;

  const amount = Number(input);
  if (isNaN(amount) || amount < 0) {
    showStatus("Please enter a valid positive budget amount.", "error");
    return;
  }

  try {
    setLoading(true, "Saving budget...");
    const res = await authFetch("/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to save budget");
    }

    await loadCurrentBudget();
    showStatus("Budget updated successfully.", "success");
  } catch (error) {
    console.error("Error saving budget:", error);
    showStatus("Unable to update the budget right now.", "error");
  } finally {
    setLoading(false);
  }
}

// ================= DARK MODE TOGGLE =================

const toggleBtn = document.getElementById("darkModeToggle");

sidebarLinks.forEach(link => {
  link.addEventListener("click", () => {
    setActiveView(link.dataset.view);
  });
});

document.querySelectorAll("[data-view-target]").forEach(button => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.viewTarget);
  });
});

document.querySelectorAll("[data-logout-action]").forEach(button => {
  button.addEventListener("click", logout);
});

[ toggleBtn, sidebarThemeToggle ].forEach(button => {
  if (button) {
    button.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
    });
  }
});

if (profileMenuBtn && profileMenu) {
  profileMenuBtn.addEventListener("click", event => {
    event.stopPropagation();
    profileMenu.classList.toggle("visible");
  });

  profileMenu.addEventListener("click", event => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    profileMenu.classList.remove("visible");
  });
}

if (loginBtn) loginBtn.addEventListener("click", login);
if (signupBtn) signupBtn.addEventListener("click", signup);
if (logoutBtn) logoutBtn.addEventListener("click", logout);

if (showSignupBtn) {
  showSignupBtn.addEventListener("click", () => {
    loginMessage.textContent = "";
    showAuth("signup");
  });
}

if (showLoginBtn) {
  showLoginBtn.addEventListener("click", () => {
    signupMessage.textContent = "";
    showAuth("login");
  });
}

if (loginPasswordInput) {
  loginPasswordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") login();
  });
}

if (signupPasswordInput) {
  signupPasswordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") signup();
  });
}

if (getToken()) {
  showDashboard();
} else {
  showAuth("login");
}

renderIcons();
