// ==============================
// GLOBAL STATE
// ==============================

let expenses = [];
let analysisExpenses = [];
let currentReceiptScan = null;
let selectedReceiptFile = null;
let selectedPaytmStatementFile = null;
let currentPaytmPreview = null;
let expenseChart = null;
let barChart = null;
let monthlyExpenseProgressChart = null;
let monthlyChart = null;
let monthlyCategoryChart = null;
let analyticsCharts = {};
let editingExpenseId = null;
let selectedBudgetMonth = "";
let editingIncomeId = null;
let subcategorySuggestionsByCategory = {};
let showAllBudgetAllocations = false;

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
const subcategorySuggestionsEl = document.getElementById("subcategorySuggestions");
const essentialCheck = document.getElementById("essentialCheck");
const nonEssentialCheck = document.getElementById("nonEssentialCheck");
const dateInput = document.getElementById("date");
const receiptImageInput = document.getElementById("receiptImage");
const receiptPreviewWrapper = document.getElementById("receiptPreviewWrapper");
const receiptPreview = document.getElementById("receiptPreview");
const scanReceiptBtn = document.getElementById("scanReceiptBtn");
const retryReceiptBtn = document.getElementById("retryReceiptBtn");
const receiptScanStatus = document.getElementById("receiptScanStatus");
const receiptReviewPanel = document.getElementById("receiptReviewPanel");
const receiptAmountInput = document.getElementById("receiptAmount");
const receiptCategoryInput = document.getElementById("receiptCategory");
const receiptDateInput = document.getElementById("receiptDate");
const receiptMerchantInput = document.getElementById("receiptMerchant");
const receiptWarningsEl = document.getElementById("receiptWarnings");
const receiptRawTextEl = document.getElementById("receiptRawText");
const receiptQualityEl = document.getElementById("receiptQuality");
const autofillReceiptBtn = document.getElementById("autofillReceiptBtn");
const saveReceiptExpenseBtn = document.getElementById("saveReceiptExpenseBtn");
const paytmStatementUploadBtn = document.getElementById("paytmStatementUploadBtn");
const paytmStatementInput = document.getElementById("paytmStatementInput");
const paytmPreviewModal = document.getElementById("paytmPreviewModal");
const paytmPreviewFileNameEl = document.getElementById("paytmPreviewFileName");
const paytmPreviewSummaryEl = document.getElementById("paytmPreviewSummary");
const paytmPreviewMessageEl = document.getElementById("paytmPreviewMessage");
const paytmPreviewTableBody = document.getElementById("paytmPreviewTableBody");
const closePaytmPreviewBtn = document.getElementById("closePaytmPreviewBtn");
const cancelPaytmImportBtn = document.getElementById("cancelPaytmImportBtn");
const confirmPaytmImportBtn = document.getElementById("confirmPaytmImportBtn");
const expenseList = document.getElementById("expenseList");
const totalEl = document.getElementById("total");

const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");
const fromDatePickerInput = document.getElementById("fromDatePicker");
const toDatePickerInput = document.getElementById("toDatePicker");
const historyLabel = document.getElementById("historyLabel");
const applyDateFilterBtn = document.getElementById("applyDateFilterBtn");
const todayDateFilterBtn = document.getElementById("todayDateFilterBtn");
const analysisModeInput = document.getElementById("analysisMode");
const analysisDateInput = document.getElementById("analysisDate");
const analysisMonthInput = document.getElementById("analysisMonth");
const analysisDateControl = document.getElementById("analysisDateControl");
const analysisMonthControl = document.getElementById("analysisMonthControl");
const analysisLabel = document.getElementById("analysisLabel");
const expenseChartEmptyEl = document.getElementById("expenseChartEmpty");
const monthlyExpenseProgressWarningEl = document.getElementById("monthlyExpenseProgressWarning");
const monthlyExpenseProgressLabelEl = document.getElementById("monthlyExpenseProgressLabel");
const monthlyExpenseProgressUtilizationEl = document.getElementById("monthlyExpenseProgressUtilization");

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
const budgetMonthInput = document.getElementById("budgetMonth");
const budgetValueInput = document.getElementById("budgetValue");
const budgetAllocationList = document.getElementById("budgetAllocationList");
const budgetAllocationToggleBtn = document.getElementById("budgetAllocationToggleBtn");
const budgetIncomeHelperEl = document.getElementById("budgetIncomeHelper");
const addIncomeBtn = document.getElementById("addIncomeBtn");
const incomePanelAddBtn = document.getElementById("incomePanelAddBtn");
const incomeModal = document.getElementById("incomeModal");
const incomeModalTitle = document.getElementById("incomeModalTitle");
const closeIncomeModalBtn = document.getElementById("closeIncomeModalBtn");
const cancelIncomeBtn = document.getElementById("cancelIncomeBtn");
const saveIncomeBtn = document.getElementById("saveIncomeBtn");
const incomeAmountInput = document.getElementById("incomeAmount");
const incomeDateInput = document.getElementById("incomeDate");
const incomeRemarksInput = document.getElementById("incomeRemarks");
const incomeModalStatusEl = document.getElementById("incomeModalStatus");
const incomeTotalThisMonthEl = document.getElementById("incomeTotalThisMonth");
const incomeEntryCountEl = document.getElementById("incomeEntryCount");
const incomeHistoryList = document.getElementById("incomeHistoryList");

// ==============================
// SMART INSIGHTS DOM ELEMENTS
// ==============================

const insightTopCategoryEl = document.getElementById("insightTopCategory");
const insightMonthlyTrendEl = document.getElementById("insightMonthlyTrend");
const insightBudgetWarningEl = document.getElementById("insightBudgetWarning");
const insightOverspendingAlertEl = document.getElementById("insightOverspendingAlert");
const insightCategoryAlertEl = document.getElementById("insightCategoryAlert");
const insightSavingsEl = document.getElementById("insightSavings");
const insightForecastedSavingsEl = document.getElementById("insightForecastedSavings");
const insightSpendingEfficiencyEl = document.getElementById("insightSpendingEfficiency");
const insightPatternEl = document.getElementById("insightPattern");
const insightMonthInput = document.getElementById("insightMonth");

// ==============================
// FORECAST DOM ELEMENTS
// ==============================

const forecastAmountEl = document.getElementById("forecastAmount");
const forecastLabelEl = document.getElementById("forecastLabel");
const forecastMessageEl = document.getElementById("forecastMessage");
const forecastAverageDailyEl = document.getElementById("forecastAverageDaily");
const forecastRemainingBudgetEl = document.getElementById("forecastRemainingBudget");
const forecastDaysTrackedEl = document.getElementById("forecastDaysTracked");
const forecastRiskLevelEl = document.getElementById("forecastRiskLevel");
const forecastExplanationEl = document.getElementById("forecastExplanation");

// ==============================
// FINANCIAL STATEMENT DOM ELEMENTS
// ==============================

const statementFromMonthInput = document.getElementById("statementFromMonth");
const statementToMonthInput = document.getElementById("statementToMonth");
const statementApplyBtn = document.getElementById("statementApplyBtn");
const statementPdfBtn = document.getElementById("statementPdfBtn");
const statementTotalBudgetEl = document.getElementById("statementTotalBudget");
const statementTotalExpensesEl = document.getElementById("statementTotalExpenses");
const statementTotalSavingsEl = document.getElementById("statementTotalSavings");
const statementAverageSavingsEl = document.getElementById("statementAverageSavings");
const statementTableBody = document.getElementById("statementTableBody");
const statementEmptyStateEl = document.getElementById("statementEmptyState");

// ==============================
// ANALYTICS DOM ELEMENTS
// ==============================

const analyticsFromMonthInput = document.getElementById("analyticsFromMonth");
const analyticsToMonthInput = document.getElementById("analyticsToMonth");
const analyticsPeriodSelect = document.getElementById("analyticsPeriodSelect");
const analyticsApplyBtn = document.getElementById("analyticsApplyBtn");
const analyticsEmptyStateEl = document.getElementById("analyticsEmptyState");
const analyticsGridEl = document.querySelector(".analytics-grid");
const analyticsPageDescriptionEl = document.getElementById("analyticsPageDescription");
const analyticsContextBadgeEl = document.getElementById("analyticsContextBadge");
const analyticsSummarySectionEl = document.getElementById("analyticsSummarySection");
const analyticsSummaryStripEl = document.getElementById("analyticsSummaryStrip");
const analyticsInsightsCardEl = document.getElementById("analyticsInsightsCard");
const analyticsInsightsListEl = document.getElementById("analyticsInsightsList");
const analyticsSummaryEls = {
  budget: document.getElementById("analyticsSummaryBudget"),
  income: document.getElementById("analyticsSummaryIncome"),
  expenses: document.getElementById("analyticsSummaryExpenses"),
  savings: document.getElementById("analyticsSummarySavings"),
  needs: document.getElementById("analyticsSummaryNeeds"),
  wants: document.getElementById("analyticsSummaryWants")
};
const analyticsExpenseCurrentNoteEl = document.getElementById("analyticsExpenseCurrentNote");
const analyticsSavingsCurrentNoteEl = document.getElementById("analyticsSavingsCurrentNote");

// ==============================
// APP SHELL DOM ELEMENTS
// ==============================

const pageTitleEl = document.getElementById("pageTitle");
const pageViews = document.querySelectorAll(".page-view");
const sidebarLinks = document.querySelectorAll(".sidebar-link");
const dashboardOnlyActions = document.querySelectorAll(".dashboard-only-action");
const appStatusEl = document.getElementById("appStatus");
const loadingStateEl = document.getElementById("loadingState");
const dashboardRemainingBudgetEl = document.getElementById("dashboardRemainingBudget");
const dashboardBudgetProgressEl = document.getElementById("dashboardBudgetProgress");
const dashboardBudgetChipEl = document.getElementById("dashboardBudgetChip");
const dashboardSavingsEl = document.getElementById("dashboardSavings");
const dashboardSavingsChipEl = document.getElementById("dashboardSavingsChip");
const dashboardExpenseChipEl = document.getElementById("dashboardExpenseChip");
const dashboardTopCategoryChipEl = document.getElementById("dashboardTopCategoryChip");
const dashboardRecentExpensesEl = document.getElementById("dashboardRecentExpenses");
const dashboardTopInsightEl = document.getElementById("dashboardTopInsight");
const dashboardForecastSummaryEl = document.getElementById("dashboardForecastSummary");
const dashboardForecastChipEl = document.getElementById("dashboardForecastChip");
const dashboardMonthInput = document.getElementById("dashboardMonth");
const dashboardPulseMonthEl = document.getElementById("dashboardPulseMonth");
const dashboardHealthScoreEl = document.getElementById("dashboardHealthScore");
const dashboardHealthGradeEl = document.getElementById("dashboardHealthGrade");
const dashboardHealthStatusEl = document.getElementById("dashboardHealthStatus");
const dashboardPulseBudgetUsedEl = document.getElementById("dashboardPulseBudgetUsed");
const dashboardPulseStatusEl = document.getElementById("dashboardPulseStatus");
const dashboardInsightBudgetEl = document.getElementById("dashboardInsightBudget");
const dashboardInsightLargestEl = document.getElementById("dashboardInsightLargest");
const dashboardInsightForecastEl = document.getElementById("dashboardInsightForecast");

const pathViewMap = {
  "/financial-statement": "financial-statement",
  "/analytics": "analytics",
  "/workflow-guide": "workflow-guide",
  "/user-guide": "workflow-guide"
};

function getRouteView() {
  return pathViewMap[window.location.pathname] || "dashboard";
}
const reportStatusEl = document.getElementById("reportStatus");
const reportMonthInput = document.getElementById("reportMonth");
const toastContainer = document.getElementById("toastContainer");
const profileMenuBtn = document.getElementById("profileMenuBtn");
const profileMenu = document.getElementById("profileMenu");
const profileAvatarEl = document.getElementById("profileAvatar");
const profileDisplayNameEl = document.getElementById("profileDisplayName");
const profileDisplayEmailEl = document.getElementById("profileDisplayEmail");
const profileNameInput = document.getElementById("profileName");
const profileEmailInput = document.getElementById("profileEmail");
const profileStatusEl = document.getElementById("profileStatus");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const sidebarThemeToggle = document.getElementById("sidebarDarkModeToggle");
const sidebarCollapseToggle = document.getElementById("sidebarCollapseToggle");

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
  setActiveView(getRouteView(), { syncRoute: false });
  initializeDateFilters();
  loadProfile();
  loadSubcategorySuggestions();
  fetchExpensesByRange();
}

function setActiveView(viewName, options = {}) {
  const { syncRoute = true } = options;
  const requestedView = document.getElementById(`view-${viewName}`) ? viewName : "dashboard";
  clearTransientMessages({ clearToasts: true });

  pageViews.forEach(view => {
    view.classList.toggle("active", view.id === `view-${requestedView}`);
  });

  sidebarLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.view === requestedView);
  });

  const activeView = document.getElementById(`view-${requestedView}`);
  if (pageTitleEl && activeView) {
    pageTitleEl.textContent = activeView.dataset.title || "Dashboard";
  }

  dashboardOnlyActions.forEach(action => {
    action.classList.toggle("hidden", requestedView !== "dashboard");
  });

  if (syncRoute) {
    const routePathByView = {
      "workflow-guide": "/user-guide",
      "financial-statement": "/financial-statement",
      analytics: "/analytics"
    };
    const nextPath = routePathByView[requestedView] || "/";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ view: requestedView }, "", nextPath);
    }
  }

  if (requestedView === "dashboard") {
    updateDashboardKpis();
    loadForecast(getSelectedDashboardMonth());
  }

  if (requestedView === "insights") {
    updateAiInsights(getSelectedInsightMonth());
  }

  if (requestedView === "financial-statement") {
    loadFinancialStatement();
  }

  if (requestedView === "analytics") {
    loadAnalytics();
  }

  setTimeout(() => {
    if (expenseChart) expenseChart.resize();
    if (barChart) barChart.resize();
    if (monthlyExpenseProgressChart) monthlyExpenseProgressChart.resize();
    if (monthlyChart) monthlyChart.resize();
    if (monthlyCategoryChart) monthlyCategoryChart.resize();
    Object.values(analyticsCharts).forEach(chart => chart?.resize());
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

function clearTransientMessages(options = {}) {
  const { clearToasts = false } = options;
  if (appStatusEl) {
    appStatusEl.textContent = "";
    appStatusEl.className = "app-status hidden";
  }

  if (clearToasts && toastContainer) {
    toastContainer.innerHTML = "";
  }

  if (clearToasts && reportStatusEl) {
    reportStatusEl.textContent = "";
  }
}

function showStatus(message, type = "info") {
  clearTransientMessages();
  if (!message) return;

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

const FILTER_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatFilterDate(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!match) return "";

  const [, year, month, day] = match;
  return `${day} ${FILTER_MONTHS[Number(month) - 1]} ${year}`;
}

function isValidIsoDate(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizeFilterDate(value) {
  const trimmedValue = String(value || "").trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);
  if (isoMatch) return isValidIsoDate(trimmedValue) ? trimmedValue : "";

  const displayMatch = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/i.exec(trimmedValue);
  if (!displayMatch) return "";

  const [, day, monthName, year] = displayMatch;
  const month = FILTER_MONTHS.findIndex(monthItem => monthItem.toLowerCase() === monthName.toLowerCase()) + 1;
  const isoDate = `${year}-${String(month).padStart(2, "0")}-${String(Number(day)).padStart(2, "0")}`;
  return isValidIsoDate(isoDate) ? isoDate : "";
}

function setFilterDateInput(input, dateStr) {
  if (!input) return;

  input.dataset.isoValue = dateStr;
  input.value = formatFilterDate(dateStr);

  const pickerInput = input === fromDateInput ? fromDatePickerInput : input === toDateInput ? toDatePickerInput : null;
  if (pickerInput) pickerInput.value = dateStr;
}

function getFilterDateInputValue(input, fallbackDate) {
  if (!input) return fallbackDate;

  const normalizedDate = normalizeFilterDate(input.value) || input.dataset.isoValue || fallbackDate;
  setFilterDateInput(input, normalizedDate);
  return normalizedDate;
}

function openHistoryDatePicker(pickerInput) {
  if (!pickerInput) return;

  if (typeof pickerInput.showPicker === "function") {
    try {
      pickerInput.showPicker();
      return;
    } catch (error) {
      // Fall through to focus/click for browsers that restrict showPicker.
    }
  }

  pickerInput.focus();
  pickerInput.click();
}

function bindHistoryDatePicker(displayInput, pickerInput) {
  if (!displayInput || !pickerInput) return;

  displayInput.addEventListener("click", () => openHistoryDatePicker(pickerInput));
  pickerInput.addEventListener("change", () => setFilterDateInput(displayInput, pickerInput.value));
}

function getCurrentMonthInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthInputValue(monthValue, offset) {
  const [year, month] = String(monthValue || getCurrentMonthInputValue()).split("-").map(Number);
  const shifted = new Date(year, month - 1 + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthDateRange(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function getSelectedDashboardMonth() {
  return dashboardMonthInput?.value || getCurrentMonthInputValue();
}

function getSelectedInsightMonth() {
  return insightMonthInput?.value || getCurrentMonthInputValue();
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

async function parseJsonResponse(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error("Profile API is not active. Please restart the server and refresh the page.");
  }
}

async function parseApiJsonResponse(res, fallbackMessage = "Request failed.") {
  const text = await res.text();
  let data = {};

  if (!text) {
    throw new Error(fallbackMessage || "The server returned an empty response.");
  }

  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(fallbackMessage || "The server returned an invalid response.");
  }

  if (!res.ok) {
    throw new Error(data.message || fallbackMessage);
  }

  return data;
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
  subcategorySuggestionsByCategory = {};
  syncSubcategorySuggestions();
  showAuth("login");
}

function updateProfileUI(user) {
  if (!user) return;

  const initials = String(user.name || "SE")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("") || "SE";

  if (profileAvatarEl) profileAvatarEl.textContent = initials;
  document.querySelectorAll(".profile-avatar").forEach(avatar => {
    avatar.textContent = initials;
  });
  if (profileDisplayNameEl) profileDisplayNameEl.textContent = user.name || "Smart Expense User";
  if (profileDisplayEmailEl) profileDisplayEmailEl.textContent = user.email || "";
  if (profileNameInput) profileNameInput.value = user.name || "";
  if (profileEmailInput) profileEmailInput.value = user.email || "";

  const profileName = document.querySelector(".profile-name");
  if (profileName) profileName.textContent = user.name || "Account";
}

async function loadProfile() {
  try {
    const res = await authFetch("/api/profile");
    const data = await parseJsonResponse(res);

    if (!res.ok) {
      throw new Error(data.message || "Failed to load profile");
    }

    updateProfileUI(data);
  } catch (error) {
    console.error("Profile load error:", error);
    if (profileStatusEl) profileStatusEl.textContent = "Unable to load profile.";
  }
}

async function saveProfile() {
  const name = profileNameInput?.value.trim();
  const email = profileEmailInput?.value.trim();

  if (!name || !email) {
    if (profileStatusEl) profileStatusEl.textContent = "Name and email are required.";
    return;
  }

  try {
    setLoading(true, "Saving profile...");
    if (profileStatusEl) profileStatusEl.textContent = "Saving profile...";

    const res = await authFetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email })
    });
    const data = await parseJsonResponse(res);

    if (!res.ok) {
      throw new Error(data.message || "Failed to save profile");
    }

    updateProfileUI(data.user);
    if (profileStatusEl) profileStatusEl.textContent = "Profile updated successfully.";
    showStatus("Profile updated successfully.", "success");
  } catch (error) {
    console.error("Profile save error:", error);
    if (profileStatusEl) profileStatusEl.textContent = error.message || "Unable to save profile.";
    showStatus(error.message || "Unable to save profile.", "error");
  } finally {
    setLoading(false);
  }
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

function getCategoryColorClass(category) {
  const normalized = String(category || "").trim().toLowerCase();
  const categoryColorMap = {
    "home": "category-home",
    "food & groceries": "category-food",
    "utilities & bills": "category-utilities",
    "transport": "category-transport",
    "entertainment": "category-entertainment",
    "healthcare": "category-healthcare",
    "education": "category-education",
    "miscellaneous": "category-miscellaneous"
  };

  return categoryColorMap[normalized] || "category-default";
}

async function loadSubcategorySuggestions() {
  if (!subcategoryInput && !expenseList) return;

  try {
    const res = await authFetch("/expenses/subcategories");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load subcategory suggestions");
    }

    subcategorySuggestionsByCategory = data.suggestions || {};
    syncSubcategorySuggestions();
  } catch (error) {
    console.error("Subcategory suggestions error:", error);
    subcategorySuggestionsByCategory = {};
    syncSubcategorySuggestions();
  }
}

function getSubcategorySuggestions(category) {
  const selectedCategory = String(category || "").trim();
  if (!selectedCategory) return [];

  const exactSuggestions = subcategorySuggestionsByCategory[selectedCategory];
  if (exactSuggestions) return exactSuggestions;

  const normalizedCategory = selectedCategory.toLowerCase();
  const matchedCategory = Object.keys(subcategorySuggestionsByCategory)
    .find(key => key.toLowerCase() === normalizedCategory);

  return matchedCategory ? subcategorySuggestionsByCategory[matchedCategory] : [];
}

function getVisibleSubcategorySuggestions(category, typedValue = "") {
  const query = String(typedValue || "").trim().toLowerCase();
  return getSubcategorySuggestions(category)
    .filter(subcategory => !query || subcategory.toLowerCase().includes(query))
    .slice(0, 5);
}

function renderSubcategorySuggestionMenu(menuEl, category, inputEl) {
  if (!menuEl || !inputEl) return;

  const suggestions = getVisibleSubcategorySuggestions(category, inputEl.value);

  if (!suggestions.length) {
    menuEl.innerHTML = "";
    menuEl.classList.add("hidden");
    return;
  }

  menuEl.innerHTML = suggestions
    .map(subcategory => `
      <button class="subcategory-suggestion-option" type="button" data-value="${escapeHtml(subcategory)}">
        <span>${escapeHtml(subcategory)}</span>
        <span class="subcategory-suggestion-remove" data-remove-value="${escapeHtml(subcategory)}" role="button" aria-label="Remove ${escapeHtml(subcategory)} suggestion">&times;</span>
      </button>
    `)
    .join("");
  menuEl.classList.remove("hidden");
}

function hideSubcategorySuggestionMenu(menuEl) {
  menuEl?.classList.add("hidden");
}

function bindSubcategorySuggestionMenu(inputEl, categoryEl, menuEl) {
  if (!inputEl || !categoryEl || !menuEl) return;

  const showSuggestions = () => {
    renderSubcategorySuggestionMenu(menuEl, categoryEl.value, inputEl);
  };

  inputEl.addEventListener("focus", showSuggestions);
  inputEl.addEventListener("input", showSuggestions);
  categoryEl.addEventListener("change", showSuggestions);

  menuEl.addEventListener("click", async event => {
    const removeButton = event.target.closest(".subcategory-suggestion-remove");
    if (removeButton) {
      event.preventDefault();
      event.stopPropagation();
      await removeSubcategorySuggestion(categoryEl.value, removeButton.dataset.removeValue || "", menuEl, inputEl);
      return;
    }

    const option = event.target.closest(".subcategory-suggestion-option");
    if (!option) return;

    inputEl.value = option.dataset.value || "";
    hideSubcategorySuggestionMenu(menuEl);
    inputEl.focus();
  });
}

async function removeSubcategorySuggestion(category, subcategory, menuEl, inputEl) {
  const selectedCategory = String(category || "").trim();
  const value = String(subcategory || "").trim();

  if (!selectedCategory || !value) return;

  try {
    const res = await authFetch("/expenses/subcategories/ignore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: selectedCategory,
        subcategory: value
      })
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to remove suggestion");
    }

    await loadSubcategorySuggestions();
    renderSubcategorySuggestionMenu(menuEl, selectedCategory, inputEl);
  } catch (error) {
    console.error("Subcategory suggestion remove error:", error);
    showStatus("Unable to remove that suggestion right now.", "error");
  }
}

function syncSubcategorySuggestions() {
  if (document.activeElement === subcategoryInput || document.activeElement === categoryInput) {
    renderSubcategorySuggestionMenu(subcategorySuggestionsEl, categoryInput?.value, subcategoryInput);
  }
}

function rememberSubcategorySuggestion(category, subcategory) {
  const selectedCategory = String(category || "").trim();
  const value = String(subcategory || "").trim();

  if (!selectedCategory || !value) return;

  if (!subcategorySuggestionsByCategory[selectedCategory]) {
    subcategorySuggestionsByCategory[selectedCategory] = [];
  }

  subcategorySuggestionsByCategory[selectedCategory] = subcategorySuggestionsByCategory[selectedCategory]
    .filter(item => item.toLowerCase() !== value.toLowerCase());

  subcategorySuggestionsByCategory[selectedCategory].unshift(value);
  subcategorySuggestionsByCategory[selectedCategory] =
    subcategorySuggestionsByCategory[selectedCategory].slice(0, 5);

  syncSubcategorySuggestions();
}

function getSelectedExpenseType() {
  return nonEssentialCheck?.checked ? false : true;
}

function getReceiptMetadataFromScan() {
  if (!currentReceiptScan) return {};

  return {
    receiptImageUrl: currentReceiptScan.receiptImageUrl || "",
    rawReceiptText: currentReceiptScan.rawText || "",
    ocrConfidence: currentReceiptScan.confidence || 0,
    extractedMerchant: receiptMerchantInput?.value.trim() || currentReceiptScan.merchant || "",
    extractedDate: receiptDateInput?.value || currentReceiptScan.date || ""
  };
}

function getReceiptMetadataForExpense() {
  return currentReceiptScan ? getReceiptMetadataFromScan() : {};
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
  const currentMonthRange = getMonthDateRange(getCurrentMonthInputValue());
  if (fromDateInput && !fromDateInput.dataset.isoValue) setFilterDateInput(fromDateInput, currentMonthRange.start);
  if (toDateInput && !toDateInput.dataset.isoValue) setFilterDateInput(toDateInput, today);
  if (dateInput && !dateInput.value) dateInput.value = today;
  if (analysisDateInput && !analysisDateInput.value) analysisDateInput.value = today;
  if (analysisMonthInput && !analysisMonthInput.value) analysisMonthInput.value = getCurrentMonthInputValue();
  if (dashboardMonthInput && !dashboardMonthInput.value) dashboardMonthInput.value = getCurrentMonthInputValue();
  if (insightMonthInput && !insightMonthInput.value) insightMonthInput.value = getCurrentMonthInputValue();
  if (!selectedBudgetMonth) selectedBudgetMonth = getCurrentMonthInputValue();
  if (budgetMonthInput && !budgetMonthInput.value) budgetMonthInput.value = selectedBudgetMonth;
  if (reportMonthInput && !reportMonthInput.value) reportMonthInput.value = getCurrentMonthInputValue();
  if (statementToMonthInput && !statementToMonthInput.value) statementToMonthInput.value = getCurrentMonthInputValue();
  if (statementFromMonthInput && !statementFromMonthInput.value) {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), Math.max(now.getMonth() - 5, 0), 1);
    statementFromMonthInput.value =
      `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, "0")}`;
  }
  if (analyticsToMonthInput && !analyticsToMonthInput.value) analyticsToMonthInput.value = getCurrentMonthInputValue();
  if (analyticsFromMonthInput && !analyticsFromMonthInput.value) {
    analyticsFromMonthInput.value = shiftMonthInputValue(getCurrentMonthInputValue(), -3);
  }
}

async function fetchExpensesByRange() {
  initializeDateFilters();

  const from = getFilterDateInputValue(fromDateInput, getTodayInputValue());
  const to = getFilterDateInputValue(toDateInput, from);

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
      ? `Showing: ${formatFilterDate(from)}`
      : `Showing: ${formatFilterDate(from)} to ${formatFilterDate(to)}`;
    refreshUI();
  } catch (error) {
    console.error("Error fetching expenses by range:", error);
    showStatus("Unable to load expenses for that date range.", "error");
  } finally {
    setLoading(false);
  }
}

if (fromDateInput && toDateInput) {
  bindHistoryDatePicker(fromDateInput, fromDatePickerInput);
  bindHistoryDatePicker(toDateInput, toDatePickerInput);
  fromDateInput.addEventListener("change", () => getFilterDateInputValue(fromDateInput, fromDateInput.dataset.isoValue || getTodayInputValue()));
  toDateInput.addEventListener("change", () => getFilterDateInputValue(toDateInput, toDateInput.dataset.isoValue || getTodayInputValue()));
}

applyDateFilterBtn?.addEventListener("click", fetchExpensesByRange);

todayDateFilterBtn?.addEventListener("click", () => {
  const today = getTodayInputValue();
  setFilterDateInput(fromDateInput, today);
  setFilterDateInput(toDateInput, today);
  fetchTodayExpenses();
});

function syncAnalysisControls() {
  const mode = analysisModeInput?.value || "month";
  analysisDateControl?.classList.toggle("hidden", mode !== "date");
  analysisMonthControl?.classList.toggle("hidden", mode !== "month");
}

async function loadAnalysisExpenses() {
  initializeDateFilters();
  syncAnalysisControls();

  const mode = analysisModeInput?.value || "month";
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
    const chartMonth = mode === "month"
      ? analysisMonthInput?.value || getCurrentMonthInputValue()
      : String(from).slice(0, 7);
    const progressRange = getMonthDateRange(chartMonth);
    const analysisPath = `/expenses/range?from=${from}&to=${to}`;
    const progressPath = `/expenses/range?from=${progressRange.start}&to=${progressRange.end}`;
    const shouldFetchProgressSeparately = analysisPath !== progressPath;
    const requests = [
      authFetch(analysisPath),
      authFetch(`/budget/current?month=${encodeURIComponent(chartMonth)}`)
    ];

    if (shouldFetchProgressSeparately) {
      requests.push(authFetch(progressPath));
    }

    const [res, budgetRes, progressRes] = await Promise.all(requests);

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to load analysis data");
    }
    if (!budgetRes.ok) {
      const data = await budgetRes.json();
      throw new Error(data.message || "Failed to load budget data");
    }
    if (progressRes && !progressRes.ok) {
      const data = await progressRes.json();
      throw new Error(data.message || "Failed to load monthly progress data");
    }

    analysisExpenses = await res.json();
    const budgetData = await budgetRes.json();
    const monthlyProgressExpenses = progressRes
      ? await progressRes.json()
      : analysisExpenses;
    if (analysisLabel) analysisLabel.textContent = label;
    if (monthlyExpenseProgressLabelEl) {
      monthlyExpenseProgressLabelEl.textContent = `Showing spending for ${formatMonth(chartMonth)}`;
    }
    updatePieChart();
    updateMonthlyExpenseProgressChart(chartMonth, monthlyProgressExpenses, Number(budgetData.budget) || 0);
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

if (dashboardMonthInput) {
  dashboardMonthInput.addEventListener("change", async () => {
    await updateDashboardKpis();
    await loadForecast(getSelectedDashboardMonth());
  });
}

if (insightMonthInput) {
  insightMonthInput.addEventListener("change", () => {
    updateAiInsights(getSelectedInsightMonth());
  });
}

if (budgetMonthInput) {
  budgetMonthInput.addEventListener("change", async () => {
    selectedBudgetMonth = budgetMonthInput.value;
    syncIncomeDateBounds();
    await loadCurrentBudget();
  });
}

if (budgetAllocationToggleBtn) {
  budgetAllocationToggleBtn.addEventListener("click", () => {
    showAllBudgetAllocations = !showAllBudgetAllocations;
    loadBudgetAllocations();
  });
}

if (statementApplyBtn) {
  statementApplyBtn.addEventListener("click", loadFinancialStatement);
}

if (statementPdfBtn) {
  statementPdfBtn.addEventListener("click", exportFinancialStatementPdf);
}

if (analyticsApplyBtn) {
  analyticsApplyBtn.addEventListener("click", loadAnalytics);
}

if (analyticsPeriodSelect) {
  analyticsPeriodSelect.addEventListener("change", () => {
    setAnalyticsPeriodDefaults(analyticsPeriodSelect.value);
    updateAnalyticsHeaderContext();
    if (document.getElementById("view-analytics")?.classList.contains("active")) {
      loadAnalytics();
    }
  });
}

[addIncomeBtn, incomePanelAddBtn].forEach(button => {
  if (button) {
    button.addEventListener("click", () => openIncomeModal());
  }
});

if (saveIncomeBtn) saveIncomeBtn.addEventListener("click", saveIncome);
if (closeIncomeModalBtn) closeIncomeModalBtn.addEventListener("click", closeIncomeModal);
if (cancelIncomeBtn) cancelIncomeBtn.addEventListener("click", closeIncomeModal);
if (incomeModal) {
  incomeModal.addEventListener("click", event => {
    if (event.target === incomeModal) closeIncomeModal();
  });
}
if (incomeAmountInput) {
  incomeAmountInput.addEventListener("keydown", event => {
    if (event.key === "Enter") saveIncome();
  });
}
if (incomeRemarksInput) {
  incomeRemarksInput.addEventListener("keydown", event => {
    if (event.key === "Enter") saveIncome();
  });
}

[statementFromMonthInput, statementToMonthInput].forEach(input => {
  if (input) {
    input.addEventListener("change", () => {
      if (document.getElementById("view-financial-statement")?.classList.contains("active")) {
        loadFinancialStatement();
      }
    });
  }
});

[analyticsFromMonthInput, analyticsToMonthInput].forEach(input => {
  if (input) {
    input.addEventListener("change", () => {
      if (document.getElementById("view-analytics")?.classList.contains("active")) {
        loadAnalytics();
      }
    });
  }
});

bindExclusiveChecks(essentialCheck, nonEssentialCheck);

if (categoryInput) {
  bindSubcategorySuggestionMenu(subcategoryInput, categoryInput, subcategorySuggestionsEl);
}

document.addEventListener("click", event => {
  if (event.target.closest(".subcategory-input-wrap")) return;

  document.querySelectorAll(".subcategory-suggestion-menu").forEach(menu => {
    hideSubcategorySuggestionMenu(menu);
  });
});

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
        ...getReceiptMetadataForExpense(),
        date
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to add expense");
    }

    rememberSubcategorySuggestion(data.expense?.category || category, data.expense?.subcategory || subcategory);
    await fetchExpensesByRange();

    amountInput.value = "";
    categoryInput.value = "Home";
    subcategoryInput.value = "";
    syncSubcategorySuggestions();
    if (essentialCheck) essentialCheck.checked = true;
    if (nonEssentialCheck) nonEssentialCheck.checked = false;
    dateInput.value = "";
    clearReceiptScan(false);
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
    await loadSubcategorySuggestions();
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
    rememberSubcategorySuggestion(data.expense?.category || category, data.expense?.subcategory || subcategory);

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
  loadBudgetAllocations();
  updateAiInsights(getSelectedInsightMonth());
  loadForecast(getSelectedDashboardMonth());
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
        <div class="subcategory-input-wrap">
          <input type="text" id="editSubcategory-${exp._id}" value="${escapeHtml(exp.subcategory || "")}" placeholder="Subcategory" autocomplete="off" />
          <div id="editSubcategorySuggestions-${exp._id}" class="subcategory-suggestion-menu hidden"></div>
        </div>
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

      const editCategoryInput = document.getElementById(`editCategory-${exp._id}`);
      const editSubcategoryInput = document.getElementById(`editSubcategory-${exp._id}`);
      const editSubcategorySuggestionsEl = document.getElementById(`editSubcategorySuggestions-${exp._id}`);
      bindSubcategorySuggestionMenu(editSubcategoryInput, editCategoryInput, editSubcategorySuggestionsEl);

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
      <span class="tag ${getCategoryColorClass(exp.category)}">${escapeHtml(formatDisplayText(exp.category))}</span>
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

  expenses.slice(0, 2).forEach(exp => {
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

function handleReceiptFileChange() {
  const file = receiptImageInput?.files?.[0];
  selectedReceiptFile = file || null;
  currentReceiptScan = null;

  if (!file) {
    clearReceiptScan();
    return;
  }

  if (!file.type.startsWith("image/")) {
    showReceiptStatus("Please choose a valid image file.", "error");
    if (scanReceiptBtn) scanReceiptBtn.disabled = true;
    return;
  }

  if (receiptPreview && receiptPreviewWrapper) {
    receiptPreview.src = URL.createObjectURL(file);
    receiptPreviewWrapper.classList.remove("hidden");
  }

  if (scanReceiptBtn) scanReceiptBtn.disabled = false;
  retryReceiptBtn?.classList.add("hidden");
  receiptReviewPanel?.classList.add("hidden");
  showReceiptStatus("Receipt ready to scan.", "info");
  setReceiptQuality("");
  renderIcons();
}

async function scanReceipt() {
  if (!selectedReceiptFile) {
    showReceiptStatus("Choose a receipt image first.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("receipt", selectedReceiptFile);

  try {
    setReceiptScanning(true);
    showReceiptStatus("Scanning receipt and extracting expense details...", "info");

    const res = await authFetch("/api/receipts/scan", {
      method: "POST",
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Receipt scan failed");
    }

    currentReceiptScan = data;
    populateReceiptReview(data);
    showReceiptStatus("Receipt scanned. Review the extracted details before saving.", "success");
  } catch (error) {
    console.error("Receipt scan error:", error);
    showReceiptStatus(error.message || "Unable to scan receipt. Please retry or enter details manually.", "error");
    retryReceiptBtn?.classList.remove("hidden");
  } finally {
    setReceiptScanning(false);
  }
}

function populateReceiptReview(data) {
  if (receiptAmountInput) receiptAmountInput.value = data.amount || "";
  if (receiptCategoryInput) receiptCategoryInput.value = data.categorySuggestion || "Miscellaneous";
  if (receiptDateInput) receiptDateInput.value = data.date || "";
  if (receiptMerchantInput) receiptMerchantInput.value = data.merchant || "";
  if (receiptRawTextEl) receiptRawTextEl.textContent = data.rawText || "No OCR text available.";

  renderReceiptWarnings(data.warnings || []);
  receiptAmountInput?.classList.toggle("input-warning", data.amountConfidence === "low" || !data.amount);
  setReceiptQuality(getReceiptQualityText(data.confidence));
  receiptReviewPanel?.classList.remove("hidden");
  retryReceiptBtn?.classList.remove("hidden");
  renderIcons();
}

function renderReceiptWarnings(warnings) {
  if (!receiptWarningsEl) return;

  if (!warnings.length) {
    receiptWarningsEl.classList.add("hidden");
    receiptWarningsEl.innerHTML = "";
    return;
  }

  receiptWarningsEl.innerHTML = warnings
    .map(warning => `<p>${escapeHtml(warning)}</p>`)
    .join("");
  receiptWarningsEl.classList.remove("hidden");
}

function applyReceiptToExpenseForm() {
  if (!currentReceiptScan) return;

  if (amountInput) amountInput.value = receiptAmountInput?.value || "";
  if (categoryInput) categoryInput.value = receiptCategoryInput?.value || "Miscellaneous";
  if (subcategoryInput) subcategoryInput.value = "Not specified";
  syncSubcategorySuggestions();
  if (dateInput) dateInput.value = receiptDateInput?.value || "";
  if (essentialCheck) essentialCheck.checked = true;
  if (nonEssentialCheck) nonEssentialCheck.checked = false;

  showReceiptStatus("Extracted details copied into the expense form.", "success");
}

async function saveReceiptExpense() {
  if (!currentReceiptScan) {
    showReceiptStatus("Scan a receipt before saving.", "error");
    return;
  }

  const amount = Number(receiptAmountInput?.value || 0);
  if (!amount || amount <= 0) {
    receiptAmountInput?.classList.add("input-warning");
    showReceiptStatus("Please confirm a valid bill total before saving.", "error");
    return;
  }

  if (!receiptDateInput?.value) {
    receiptDateInput?.classList.add("input-warning");
    showReceiptStatus("Please enter the receipt date before saving.", "error");
    return;
  }

  applyReceiptToExpenseForm();
  await addExpense();
}

function setReceiptScanning(isScanning) {
  if (scanReceiptBtn) {
    scanReceiptBtn.disabled = isScanning || !selectedReceiptFile;
    scanReceiptBtn.innerHTML = isScanning
      ? `<span class="button-spinner"></span>Scanning...`
      : `<i data-lucide="sparkles"></i>Extract from Receipt`;
  }
  renderIcons();
}

function showReceiptStatus(message, type = "info") {
  if (!receiptScanStatus) return;

  if (!message) {
    receiptScanStatus.className = "receipt-status hidden";
    receiptScanStatus.textContent = "";
    return;
  }

  receiptScanStatus.className = `receipt-status ${type}`;
  receiptScanStatus.textContent = message;
}

function setReceiptQuality(text) {
  if (!receiptQualityEl) return;

  if (!text) {
    receiptQualityEl.classList.add("hidden");
    receiptQualityEl.textContent = "";
    return;
  }

  receiptQualityEl.textContent = text;
  receiptQualityEl.classList.remove("hidden");
}

function getReceiptQualityText(confidence) {
  const value = Math.round(Number(confidence) || 0);
  if (value >= 75) return `High confidence (${value}%)`;
  if (value >= 50) return `Medium confidence (${value}%)`;
  if (value > 0) return `Low confidence (${value}%)`;
  return "Manual review needed";
}

// ==============================
// PAYTM STATEMENT IMPORT
// ==============================

async function handlePaytmStatementSelection() {
  const file = paytmStatementInput?.files?.[0];
  if (!file) return;

  selectedPaytmStatementFile = file;
  currentPaytmPreview = null;

  try {
    setPaytmUploadLoading(true);
    const formData = new FormData();
    formData.append("statement", file);
    const res = await authFetch("/api/paytm-statements/preview", {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    if (!data.summary) {
      throw new Error(data.message || "Unable to preview this Paytm statement.");
    }

    currentPaytmPreview = data;
    renderPaytmPreview(data, res.ok ? "" : data.message);
    paytmPreviewModal?.classList.remove("hidden");
    renderIcons();
  } catch (error) {
    console.error("Paytm statement preview error:", error);
    resetPaytmImport();
    showStatus(error.message || "Unable to parse this Paytm statement.", "error");
  } finally {
    setPaytmUploadLoading(false);
  }
}

function renderPaytmPreview(data, message = "") {
  const summary = data.summary || {};
  const groups = data.groups || [];

  if (paytmPreviewFileNameEl) {
    paytmPreviewFileNameEl.textContent = data.fileName || selectedPaytmStatementFile?.name || "";
  }

  if (paytmPreviewSummaryEl) {
    paytmPreviewSummaryEl.innerHTML = `
      ${getPaytmSummaryItem("Transactions Found", summary.totalTransactionsFound || 0)}
      ${getPaytmSummaryItem("Ready to Import", summary.importableTransactions || 0)}
      ${getPaytmSummaryItem("Grouped Expenses", summary.groupedExpenses || 0)}
      ${getPaytmSummaryItem("Skipped", summary.skippedTransactions || 0)}
      ${getPaytmSummaryItem("Duplicates", summary.duplicateTransactions || 0)}
      ${getPaytmSummaryItem("Import Amount", formatPaytmCurrency(summary.totalAmountToImport || 0))}
    `;
  }

  if (paytmPreviewTableBody) {
    paytmPreviewTableBody.innerHTML = groups.length
      ? groups.map(group => `
          <tr>
            <td>${escapeHtml(formatPaytmImportDate(group.date))}</td>
            <td class="paytm-tags-list">${escapeHtml((group.paytmTags || []).join(", ") || "Unknown UPI Tag")}</td>
            <td>${escapeHtml(group.category)}</td>
            <td>${escapeHtml(group.subcategory)}</td>
            <td>${formatPaytmCurrency(group.amount)}</td>
            <td><span class="type-badge ${group.isEssential ? "essential" : "non-essential"}">${group.isEssential ? "Essential" : "Non-essential"}</span></td>
          </tr>
        `).join("")
      : '<tr><td colspan="6">No new grouped expenses are available to import.</td></tr>';
  }

  showPaytmPreviewMessage(
    message || (
      summary.duplicateTransactions
        ? `${summary.duplicateTransactions} duplicate transaction${summary.duplicateTransactions === 1 ? " was" : "s were"} excluded.`
        : ""
    ),
    message ? "error" : "info"
  );

  if (confirmPaytmImportBtn) {
    confirmPaytmImportBtn.disabled = !summary.importableTransactions;
  }
}

function getPaytmSummaryItem(label, value) {
  return `
    <div class="paytm-summary-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `;
}

function formatPaytmImportDate(value) {
  if (!value) return "Unknown";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatPaytmCurrency(value) {
  const amount = Number(value) || 0;
  return `\u20B9${amount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

async function importPaytmStatement() {
  if (!selectedPaytmStatementFile || !currentPaytmPreview?.summary?.importableTransactions) {
    showPaytmPreviewMessage("Choose and preview a Paytm statement before importing.", "error");
    return;
  }

  try {
    setPaytmImportLoading(true);
    const formData = new FormData();
    formData.append("statement", selectedPaytmStatementFile);
    const res = await authFetch("/api/paytm-statements/import", {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Unable to import Paytm expenses.");
    }

    const importedDates = (currentPaytmPreview.groups || []).map(group => group.date).sort();
    if (importedDates.length) {
      setFilterDateInput(fromDateInput, importedDates[0]);
      setFilterDateInput(toDateInput, importedDates[importedDates.length - 1]);
    }

    closePaytmPreview();
    await fetchExpensesByRange();
    await updateDashboardKpis();
    showStatus(
      `${data.importedExpenses} grouped Paytm expense${data.importedExpenses === 1 ? "" : "s"} imported successfully.`,
      "success"
    );
  } catch (error) {
    console.error("Paytm statement import error:", error);
    showPaytmPreviewMessage(error.message || "Unable to import Paytm expenses.", "error");
  } finally {
    setPaytmImportLoading(false);
  }
}

function showPaytmPreviewMessage(message, type = "info") {
  if (!paytmPreviewMessageEl) return;

  if (!message) {
    paytmPreviewMessageEl.className = "receipt-status hidden";
    paytmPreviewMessageEl.textContent = "";
    return;
  }

  paytmPreviewMessageEl.className = `receipt-status ${type}`;
  paytmPreviewMessageEl.textContent = message;
}

function setPaytmUploadLoading(isLoading) {
  if (!paytmStatementUploadBtn) return;
  paytmStatementUploadBtn.disabled = isLoading;
  paytmStatementUploadBtn.innerHTML = isLoading
    ? '<span class="button-spinner"></span>Parsing Statement'
    : '<i data-lucide="file-up"></i>Upload Paytm UPI Statement';
  renderIcons();
}

function setPaytmImportLoading(isLoading) {
  if (!confirmPaytmImportBtn) return;
  confirmPaytmImportBtn.disabled = isLoading;
  confirmPaytmImportBtn.innerHTML = isLoading
    ? '<span class="button-spinner"></span>Importing'
    : '<i data-lucide="download"></i>Import Expenses';
  renderIcons();
}

function closePaytmPreview() {
  paytmPreviewModal?.classList.add("hidden");
  resetPaytmImport();
}

function resetPaytmImport() {
  selectedPaytmStatementFile = null;
  currentPaytmPreview = null;
  if (paytmStatementInput) paytmStatementInput.value = "";
  if (paytmPreviewTableBody) paytmPreviewTableBody.innerHTML = "";
  if (paytmPreviewSummaryEl) paytmPreviewSummaryEl.innerHTML = "";
  showPaytmPreviewMessage("");
}

function clearReceiptScan(clearFile = true) {
  currentReceiptScan = null;
  selectedReceiptFile = clearFile ? null : selectedReceiptFile;
  if (clearFile && receiptImageInput) receiptImageInput.value = "";
  if (clearFile && receiptPreview) receiptPreview.src = "";
  if (clearFile) receiptPreviewWrapper?.classList.add("hidden");
  receiptReviewPanel?.classList.add("hidden");
  retryReceiptBtn?.classList.add("hidden");
  if (scanReceiptBtn) scanReceiptBtn.disabled = !selectedReceiptFile;
  showReceiptStatus("");
  setReceiptQuality("");
}

// ==============================
// DASHBOARD KPI CARDS
// ==============================

async function updateTotal() {
  return updateDashboardKpis();
}

async function updateDashboardKpis() {
  if (!totalEl) return;

  try {
    const currentMonth = dashboardMonthInput?.value || getCurrentMonthInputValue();
    if (dashboardMonthInput && dashboardMonthInput.value !== currentMonth) dashboardMonthInput.value = currentMonth;
    const now = new Date();
    const [selectedYear, selectedMonthNumber] = currentMonth.split("-").map(Number);
    const previousMonthDate = new Date(selectedYear, selectedMonthNumber - 2, 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, "0")}`;
    const range = getMonthDateRange(currentMonth);

    const [monthlyRes, budgetRes, expensesRes] = await Promise.all([
      authFetch("/expenses/monthly"),
      authFetch(`/budget/current?month=${encodeURIComponent(currentMonth)}`),
      authFetch(`/expenses/range?from=${range.start}&to=${range.end}`)
    ]);
    const monthlyData = await monthlyRes.json();
    const budgetData = await budgetRes.json();
    const currentMonthExpenses = await expensesRes.json();

    const currentSummary = (monthlyData || []).find(month => month.month === currentMonth) || {};
    const previousSummary = (monthlyData || []).find(month => month.month === previousMonth) || {};
    const currentTotal = Number(currentSummary.totalSpent) || 0;
    const previousTotal = Number(previousSummary.totalSpent) || 0;
    const budget = Number(budgetData.budget) || 0;
    const remaining = Math.max(budget - currentTotal, 0);
    const usedPercent = budget ? Math.min(Math.round((currentTotal / budget) * 100), 999) : 0;
    const leftPercent = budget ? Math.max(100 - Math.min(usedPercent, 100), 0) : 0;
    const isCurrentDashboardMonth = currentMonth === getCurrentMonthInputValue();
    const totalDays = new Date(selectedYear, selectedMonthNumber, 0).getDate();
    const daysRemaining = isCurrentDashboardMonth ? Math.max(totalDays - now.getDate(), 0) : 0;

    totalEl.textContent = formatCurrency(currentTotal);
    if (dashboardExpenseChipEl) {
      const trendText = getMonthTrendText(currentTotal, previousTotal);
      const dayText = isCurrentDashboardMonth
        ? `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`
        : "Completed month";
      dashboardExpenseChipEl.textContent = `${currentMonthExpenses.length} transaction${currentMonthExpenses.length === 1 ? "" : "s"} | ${dayText} | ${trendText}`;
    }

    if (dashboardRemainingBudgetEl) {
      dashboardRemainingBudgetEl.textContent = Math.round(budget).toLocaleString("en-IN");
    }
    if (dashboardBudgetProgressEl) {
      dashboardBudgetProgressEl.style.width = `${Math.min(usedPercent, 100)}%`;
    }
    if (dashboardBudgetChipEl) {
      dashboardBudgetChipEl.textContent = budget
        ? `${usedPercent}% used / ${leftPercent}% left`
        : "Set a monthly budget";
    }

    if (dashboardSavingsEl) {
      dashboardSavingsEl.textContent = Math.round(remaining).toLocaleString("en-IN");
    }
    if (dashboardSavingsChipEl) {
      dashboardSavingsChipEl.textContent = budget
        ? `${formatCurrency(remaining)} projected monthly savings`
        : "Budget needed for savings";
    }

    const topCategory = updateDashboardTopCategory(currentSummary.byCategory || {}, currentTotal);
    updateDashboardPulse({
      month: currentMonth,
      budget,
      currentTotal,
      remaining,
      usedPercent,
      topCategory
    });
  } catch (error) {
    console.error("Error loading dashboard KPIs:", error);
    totalEl.textContent = formatCurrency(0);
  }
}

function getMonthTrendText(currentTotal, previousTotal) {
  if (!previousTotal && currentTotal) return "No prior-month baseline";
  if (!previousTotal) return "No prior-month data";

  const diff = currentTotal - previousTotal;
  const percent = Math.round((Math.abs(diff) / previousTotal) * 100);
  if (diff > 0) return `Up ${percent}% from last month`;
  if (diff < 0) return `Down ${percent}% from last month`;
  return "Flat from last month";
}

function updateDashboardTopCategory(byCategory, currentTotal) {
  const entries = Object.entries(byCategory || {})
    .map(([category, amount]) => [category, Number(amount) || 0])
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  const el = document.getElementById("topCategory");
  if (!entries.length || !currentTotal) {
    if (el) el.textContent = "No data yet";
    if (dashboardTopCategoryChipEl) dashboardTopCategoryChipEl.textContent = "0% of expenses";
    return null;
  }

  const [category, amount] = entries[0];
  const percent = Math.round((amount / currentTotal) * 100);
  if (el) el.textContent = `${formatDisplayText(category)} (${formatCurrency(amount)})`;
  if (dashboardTopCategoryChipEl) dashboardTopCategoryChipEl.textContent = `${percent}% of expenses`;
  return { category, amount, percent };
}

function updateDashboardPulse({ month, budget, currentTotal, remaining, usedPercent, topCategory }) {
  const forecastText = dashboardForecastChipEl?.textContent || "";
  const isLowForecastConfidence = /low confidence|early/i.test(forecastText);
  if (dashboardPulseMonthEl) dashboardPulseMonthEl.textContent = formatMonth(month);

  if (!budget) {
    if (dashboardHealthScoreEl) {
      dashboardHealthScoreEl.textContent = "Not enough information to generate a score";
      dashboardHealthScoreEl.classList.add("no-score");
    }
    if (dashboardHealthGradeEl) {
      dashboardHealthGradeEl.textContent = "Budget Required";
      dashboardHealthGradeEl.dataset.gradeColor = "amber";
    }
    if (dashboardHealthStatusEl) dashboardHealthStatusEl.textContent = "Set a monthly budget to calculate financial health.";
    if (dashboardPulseBudgetUsedEl) dashboardPulseBudgetUsedEl.textContent = "No budget";
    if (dashboardPulseStatusEl) dashboardPulseStatusEl.textContent = "No Budget";
    if (dashboardInsightBudgetEl) dashboardInsightBudgetEl.textContent = "Set a monthly budget";
    if (dashboardInsightLargestEl) {
      dashboardInsightLargestEl.textContent = topCategory
        ? `Largest spend: ${formatDisplayText(topCategory.category)}`
        : "Largest spend: no expenses yet";
    }
    if (dashboardInsightForecastEl) {
      dashboardInsightForecastEl.textContent = isLowForecastConfidence
        ? "Forecast confidence low"
        : "Forecast confidence normal";
    }
    return;
  }

  const savingsRatio = budget ? remaining / budget : 0;
  const budgetScore = Math.max(0, 40 - Math.max(usedPercent - 75, 0));
  const savingsScore = Math.round(Math.min(savingsRatio, 1) * 30);
  const forecastScore = isLowForecastConfidence ? 10 : 20;
  const consistencyScore = currentTotal > 0 ? 10 : 5;
  const score = Math.max(0, Math.min(100, budgetScore + savingsScore + forecastScore + consistencyScore));
  const status = usedPercent >= 100 ? "Over Budget" : usedPercent >= 85 ? "Watch" : "On Track";
  const healthGrade = getFinancialHealthGrade(score);

  if (dashboardHealthScoreEl) {
    dashboardHealthScoreEl.textContent = `${score} / 100`;
    dashboardHealthScoreEl.classList.remove("no-score");
  }
  if (dashboardHealthGradeEl) {
    dashboardHealthGradeEl.textContent = healthGrade.grade;
    dashboardHealthGradeEl.dataset.gradeColor = healthGrade.color;
  }
  if (dashboardHealthStatusEl) dashboardHealthStatusEl.textContent = healthGrade.status;
  if (dashboardPulseBudgetUsedEl) dashboardPulseBudgetUsedEl.textContent = budget ? `${usedPercent}%` : "No budget";
  if (dashboardPulseStatusEl) dashboardPulseStatusEl.textContent = status;
  if (dashboardInsightBudgetEl) {
    dashboardInsightBudgetEl.textContent = budget
      ? usedPercent <= 75
        ? "Budget utilization healthy"
        : usedPercent < 100
          ? "Budget utilization needs attention"
          : "Budget limit exceeded"
      : "Set a monthly budget";
  }
  if (dashboardInsightLargestEl) {
    dashboardInsightLargestEl.textContent = topCategory
      ? `Largest spend: ${formatDisplayText(topCategory.category)}`
      : "Largest spend: no expenses yet";
  }
  if (dashboardInsightForecastEl) {
    dashboardInsightForecastEl.textContent = isLowForecastConfidence
      ? "Forecast confidence low"
      : "Forecast confidence normal";
  }
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
    if (expenseChartEmptyEl) expenseChartEmptyEl.classList.remove("hidden");
    canvas.classList.add("hidden");
    return;
  }

  if (expenseChartEmptyEl) expenseChartEmptyEl.classList.add("hidden");
  canvas.classList.remove("hidden");

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
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
        borderRadius: 0,
        borderSkipped: false,
        barThickness: 24,
        maxBarThickness: 24
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
// MONTHLY EXPENSE PROGRESS CHART
// ==============================

function updateMonthlyExpenseProgressChart(monthValue, monthExpenses = [], monthlyBudget = 0) {
  const canvas = document.getElementById("monthlyExpenseProgressChart");
  if (!canvas) return;

  const month = /^\d{4}-\d{2}$/.test(monthValue || "")
    ? monthValue
    : getCurrentMonthInputValue();
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const today = new Date();
  const selectedMonthStart = new Date(year, monthNumber - 1, 1);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const visibleExpenseDays = selectedMonthStart.getTime() === currentMonthStart.getTime()
    ? today.getDate()
    : selectedMonthStart < currentMonthStart
      ? daysInMonth
      : 0;
  const labels = Array.from({ length: daysInMonth }, (_, index) => String(index + 1));
  const dailyTotals = Array(daysInMonth).fill(0);

  monthExpenses.forEach(exp => {
    const dateKey = String(exp.date || "").slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    if (!match || `${match[1]}-${match[2]}` !== month) return;

    const day = Number(match[3]);
    if (day >= 1 && day <= daysInMonth) {
      dailyTotals[day - 1] += Number(exp.amount) || 0;
    }
  });

  let runningTotal = 0;
  const cumulativeTotals = dailyTotals.map((amount, index) => {
    if (index + 1 > visibleExpenseDays) return null;
    runningTotal += amount;
    return runningTotal;
  });
  const budget = Math.max(Number(monthlyBudget) || 0, 0);
  const budgetLine = labels.map(() => budget);
  const actualTotal = cumulativeTotals.reduce((latestTotal, total) =>
    total === null ? latestTotal : Number(total) || 0, 0
  );
  const utilizationPercent = budget > 0 ? Math.round((actualTotal / budget) * 100) : 0;
  const exceededDayIndex = budget > 0
    ? cumulativeTotals.findIndex(total => Number(total) > budget)
    : -1;

  if (monthlyExpenseProgressUtilizationEl) {
    monthlyExpenseProgressUtilizationEl.textContent =
      `Actual ${formatCurrency(actualTotal)} / Budget ${formatCurrency(budget)} • ${utilizationPercent}% used`;
  }

  if (monthlyExpenseProgressWarningEl) {
    monthlyExpenseProgressWarningEl.classList.toggle("hidden", exceededDayIndex === -1);
    monthlyExpenseProgressWarningEl.textContent = exceededDayIndex === -1
      ? "⚠ Budget crossed on Day X"
      : `⚠ Budget crossed on Day ${exceededDayIndex + 1}`;
  }

  const ctx = canvas.getContext("2d");
  const expenseGradient = ctx.createLinearGradient(0, 0, 0, 280);
  expenseGradient.addColorStop(0, "rgba(15, 118, 110, 0.18)");
  expenseGradient.addColorStop(1, "rgba(15, 118, 110, 0)");
  const weeklyTicks = new Set([1, 7, 14, 21, 28, daysInMonth]);

  if (monthlyExpenseProgressChart) monthlyExpenseProgressChart.destroy();

  monthlyExpenseProgressChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Actual Expenses",
          data: cumulativeTotals,
          borderColor: "#0f766e",
          backgroundColor: expenseGradient,
          borderWidth: 3,
          fill: true,
          pointBackgroundColor: cumulativeTotals.map((_, index) =>
            index === exceededDayIndex ? "#d97706" : "#0f766e"
          ),
          pointBorderColor: cumulativeTotals.map((_, index) =>
            index === exceededDayIndex ? "#ffffff" : "#ffffff"
          ),
          pointBorderWidth: 2,
          pointRadius: cumulativeTotals.map((total, index) =>
            index === exceededDayIndex && total !== null ? 6 : 0
          ),
          pointHoverRadius: cumulativeTotals.map((total, index) =>
            index === exceededDayIndex && total !== null ? 8 : 5
          ),
          stepped: "after",
          tension: 0
        },
        {
          label: "Monthly Budget",
          data: budgetLine,
          borderColor: "#1d4ed8",
          borderDash: [8, 6],
          borderWidth: 2,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
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
            title(items) {
              const day = Number(items[0]?.label || 1);
              const date = `${month}-${String(day).padStart(2, "0")}`;
              return formatFullDate(date);
            },
            label(context) {
              if (context.dataset.label === "Monthly Budget") {
                return `Budget amount: ${formatCurrency(context.raw)}`;
              }
              return `Cumulative expense: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      layout: {
        padding: {
          top: 8,
          right: 16,
          bottom: 4,
          left: 4
        }
      },
      scales: {
        x: {
          grid: { display: false },
          title: {
            display: true,
            text: "Day of month",
            color: "#475467",
            font: {
              family: "Inter",
              size: 12,
              weight: "800"
            }
          },
          ticks: {
            ...getChartTickConfig(),
            autoSkip: false,
            maxRotation: 0,
            callback: value => {
              const day = Number(labels[value]);
              return weeklyTicks.has(day) ? day : "";
            }
          }
        },
        y: {
          beginAtZero: true,
          border: { display: false },
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


// ==============================
// TOP CATEGORY
// ==============================

function updateTopCategory() {
  if (document.getElementById("view-dashboard")?.classList.contains("active")) {
    return;
  }

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
      authFetch("/budget/monthly?includeIncome=true")
    ]);
    const data = await expensesRes.json();
    const budgetData = await budgetsRes.json();

    if ((!data || data.length === 0) && (!budgetData || budgetData.length === 0)) {
      if (monthlyChart) monthlyChart.destroy();
      if (monthlyCategoryChart) monthlyCategoryChart.destroy();
      return;
    }

    renderMonthlyCategoryChart(data || []);

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
    const savingTotals = latestMonths.map((month, index) =>
      Math.max((budgetTotals[index] || 0) - (expenseTotalsByMonth[month] || 0), 0)
    );
    const isOverBudget = latestMonths.map((_, index) =>
      budgetTotals[index] > 0 && expenseTotals[index] > budgetTotals[index]
    );
    const momChanges = expenseTotals.map((amount, index) => {
      if (index === 0) return null;
      const previousAmount = expenseTotals[index - 1];
      if (previousAmount === 0) {
        return amount === 0
          ? { label: "0%", color: "#16a34a" }
          : { label: "↑ 100%", color: isOverBudget[index] ? "#dc2626" : "#d97706" };
      }

      const percent = Math.round(((amount - previousAmount) / previousAmount) * 100);
      if (percent <= 0) {
        return { label: `↓ ${Math.abs(percent)}%`, color: "#16a34a" };
      }
      return {
        label: `↑ ${percent}%`,
        color: isOverBudget[index] ? "#dc2626" : "#d97706"
      };
    });
    const monthlyTrendLabelPlugin = createMonthlyTrendLabelPlugin({
      momChanges
    });

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
            backgroundColor: "rgba(29, 78, 216, 0.88)",
            borderColor: "#1d4ed8",
            borderWidth: 1,
            borderRadius: 0,
            borderSkipped: false,
            categoryPercentage: 0.58,
            barPercentage: 0.72,
            maxBarThickness: 22
          },
          {
            label: "Expenses",
            data: expenseTotals,
            backgroundColor: expenseTotals.map((_, index) =>
              isOverBudget[index] ? "rgba(220, 38, 38, 0.86)" : "rgba(217, 119, 6, 0.78)"
            ),
            borderColor: expenseTotals.map((_, index) =>
              isOverBudget[index] ? "#dc2626" : "#d97706"
            ),
            borderWidth: expenseTotals.map((_, index) =>
              isOverBudget[index] ? 2 : 1
            ),
            borderRadius: 0,
            borderSkipped: false,
            categoryPercentage: 0.58,
            barPercentage: 0.72,
            maxBarThickness: 22
          },
          {
            label: "Savings",
            data: savingTotals,
            backgroundColor: "rgba(22, 163, 74, 0.82)",
            borderColor: "#16a34a",
            borderWidth: 1,
            borderRadius: 0,
            borderSkipped: false,
            categoryPercentage: 0.58,
            barPercentage: 0.72,
            maxBarThickness: 22
          },
          {
            type: "line",
            label: "Expense Trend",
            data: expenseTotals,
            borderColor: "#0f766e",
            backgroundColor: "#0f766e",
            borderDash: [3, 4],
            borderWidth: 1.5,
            pointBackgroundColor: expenseTotals.map((_, index) =>
              isOverBudget[index] ? "#dc2626" : momChanges[index]?.color || "#0f766e"
            ),
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: false,
            tension: 0,
            order: 0
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
          monthlyTrendLabels: {
            enabled: true
          },
          tooltip: {
            backgroundColor: "rgba(17, 24, 39, 0.94)",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            padding: 14,
            cornerRadius: 12,
            callbacks: {
              label: ctx => {
                const label = `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`;
                if (ctx.dataset.label !== "Expenses") return label;
                return isOverBudget[ctx.dataIndex]
                  ? `${label} (Over budget)`
                  : label;
              },
              afterBody(items) {
                const item = items.find(ctx => ctx.dataset.label === "Expenses");
                const mom = item ? momChanges[item.dataIndex] : null;
                return mom ? [`MoM change: ${mom.label}`] : [];
              }
            }
          }
        },
        layout: {
          padding: {
            top: 46,
            right: 18,
            bottom: 6,
            left: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: "rgba(228, 231, 236, 0.72)" },
            ticks: {
              ...getChartTickConfig(),
              callback: value => formatCurrency(value)
            },
            suggestedMax: Math.max(...budgetTotals, ...expenseTotals, ...savingTotals, 0) * 1.22
          },
          x: {
            border: { display: false },
            grid: { display: false },
            ticks: getChartTickConfig()
          }
        }
      },
      plugins: [monthlyTrendLabelPlugin]
    });

  } catch (err) {
    console.error("Monthly trend error:", err);
  }
}

function createMonthlyTrendLabelPlugin({ momChanges }) {
  return {
    id: "monthlyTrendLabels",
    afterDatasetsDraw(chart) {
      const options = chart.options.plugins?.monthlyTrendLabels;
      if (!options?.enabled) return;

      const { ctx, chartArea } = chart;
      const momFontSize = chart.width < 520 ? 9 : 10;

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      const trendMeta = chart.getDatasetMeta(chart.data.datasets.findIndex(dataset => dataset.label === "Expense Trend"));
      if (trendMeta && !trendMeta.hidden) {
        ctx.font = `800 ${momFontSize}px Inter, sans-serif`;

        trendMeta.data.forEach((point, dataIndex) => {
          if (dataIndex === 0 || !momChanges[dataIndex]) return;

          const previousPoint = trendMeta.data[dataIndex - 1];
          if (!previousPoint) return;

          const x = (previousPoint.x + point.x) / 2;
          const y = Math.max(((previousPoint.y + point.y) / 2) - 8, chartArea.top + 10);

          ctx.fillStyle = momChanges[dataIndex].color;
          ctx.fillText(momChanges[dataIndex].label, x, y);
        });
      }

      ctx.restore();
    }
  };
}

function renderMonthlyCategoryChart(monthlyData) {
  const canvas = document.getElementById("monthlyCategoryChart");
  if (!canvas) return;

  const monthlyDataByKey = Object.fromEntries(
    (monthlyData || []).map(month => [month.month, month])
  );
  const monthKeys = getLatestThreeMonthKeys();
  const recentMonths = monthKeys.map(month =>
    normalizeMonthlyCategoryData(monthlyDataByKey[month] || { month, byCategory: {} })
  );
  const categories = EXPENSE_CATEGORIES.filter(category =>
    recentMonths.some(month => Number(month.byCategory?.[category] || 0) > 0)
  );
  const labels = recentMonths.map(month => formatMonth(month.month));
  const chartWidth = canvas.getBoundingClientRect().width || canvas.clientWidth || 900;
  const plotWidth = Math.max(chartWidth - 120, 300);
  const pixelsPerMonth = plotWidth / Math.max(labels.length, 1);
  const barWidth = Math.max(8, Math.min(12, Math.floor(pixelsPerMonth / 42)));
  const barGap = 4;
  const offsetStep = (barWidth + barGap) / pixelsPerMonth;

  if (categories.length === 0) {
    if (monthlyCategoryChart) monthlyCategoryChart.destroy();
    return;
  }

  const categoryColorIndex = Object.fromEntries(
    categories.map((category, index) => [category, index])
  );
  const barData = [];
  const barColors = [];
  const barBorderColors = [];

  recentMonths.forEach((month, monthIndex) => {
    const activeCategories = categories.filter(category =>
      Number(month.byCategory?.[category] || 0) > 0
    );

    activeCategories.forEach((category, barIndex) => {
      const centeredOffset = (barIndex - (activeCategories.length - 1) / 2) * offsetStep;
      barData.push({
        x: monthIndex + centeredOffset,
        y: Number(month.byCategory[category]) || 0,
        month: labels[monthIndex],
        category
      });
      barColors.push(getChartColor(categoryColorIndex[category], 0.86));
      barBorderColors.push(getChartColor(categoryColorIndex[category], 1));
    });
  });

  const datasets = [{
    label: "Category Spending",
    data: barData,
    parsing: false,
    backgroundColor: barColors,
    borderColor: barBorderColors,
    borderWidth: 0,
    borderRadius: 0,
    borderSkipped: false,
    barThickness: barWidth,
    maxBarThickness: barWidth
  }];

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
        legend: {
          ...getChartLegendConfig(),
          onClick: () => {},
          labels: {
            ...getChartLegendConfig().labels,
            generateLabels: () => categories.map(category => ({
              text: formatDisplayText(category),
              fillStyle: getChartColor(categoryColorIndex[category], 0.86),
              strokeStyle: getChartColor(categoryColorIndex[category], 1),
              lineWidth: 1,
              hidden: false
            }))
          }
        },
        tooltip: {
          backgroundColor: "rgba(17, 24, 39, 0.94)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          padding: 14,
          cornerRadius: 10,
          callbacks: {
            title: items => items[0]?.raw?.month || "",
            label: ctx => `${formatDisplayText(ctx.raw?.category)}: ${formatCurrency(ctx.raw?.y || 0)}`
          }
        }
      },
      scales: {
        x: {
          type: "linear",
          min: -0.5,
          max: labels.length - 0.5,
          grid: { display: false },
          afterBuildTicks: axis => {
            axis.ticks = labels.map((_, index) => ({ value: index }));
          },
          title: {
            display: true,
            text: "Month",
            color: "#475467",
            font: {
              family: "Inter",
              size: 12,
              weight: "800"
            }
          },
          ticks: {
            ...getChartTickConfig(),
            stepSize: 1,
            callback: value => labels[Math.round(value)] || ""
          }
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

function getLatestThreeMonthKeys() {
  const now = new Date();
  const months = [];

  for (let offset = 2; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    );
  }

  return months;
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

function getSelectedBudgetMonth() {
  const pickerValue = document.getElementById("budgetMonth")?.value;
  if (/^\d{4}-\d{2}$/.test(pickerValue || "")) {
    selectedBudgetMonth = pickerValue;
  }
  return selectedBudgetMonth || getCurrentMonthInputValue();
}

 async function loadCurrentBudget() {
  try {
    const month = getSelectedBudgetMonth();
    if (budgetMonthInput && budgetMonthInput.value !== month) budgetMonthInput.value = month;
    console.log("Loading budget month:", month);
    const res = await authFetch(`/budget/current?month=${encodeURIComponent(month)}`);
    const data = await res.json();

    const budget = data.budget || 0;
    const baseBudget = data.baseBudget ?? budget;
    const additionalIncome = data.additionalIncome || 0;
    const spent = data.spent || 0;
    const remaining = Math.max(budget - spent, 0);

    if (budgetValueInput) budgetValueInput.value = baseBudget || "";
    if (budgetAmountEl) budgetAmountEl.textContent = Math.round(budget).toLocaleString("en-IN");
    if (budgetIncomeHelperEl) budgetIncomeHelperEl.textContent = `${formatCurrency(additionalIncome)} additional income`;
    if (budgetSpentEl) budgetSpentEl.textContent = Math.round(spent).toLocaleString("en-IN");
    if (budgetRemainingEl) budgetRemainingEl.textContent = Math.round(remaining).toLocaleString("en-IN");
    if (dashboardRemainingBudgetEl && month === getCurrentMonthInputValue()) {
      dashboardRemainingBudgetEl.textContent = Math.round(budget).toLocaleString("en-IN");
    }

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
  } finally {
    loadAdditionalIncome(getSelectedBudgetMonth());
  }
}

async function loadAdditionalIncome(month = getSelectedBudgetMonth()) {
  if (!incomeHistoryList && !incomeTotalThisMonthEl && !budgetIncomeHelperEl) return;

  try {
    const res = await authFetch(`/income?month=${encodeURIComponent(month)}`);
    const data = await parseApiJsonResponse(res, "Failed to load additional income.");

    renderAdditionalIncome(data.incomes || [], Number(data.total) || 0);
  } catch (error) {
    console.error("Additional income error:", error);
    renderAdditionalIncome([], 0);
  }
}

function renderAdditionalIncome(incomes, total) {
  if (budgetIncomeHelperEl) {
    budgetIncomeHelperEl.textContent = `${formatCurrency(total)} additional income`;
  }
  if (incomeTotalThisMonthEl) {
    incomeTotalThisMonthEl.textContent = formatCurrency(total);
  }
  if (incomeEntryCountEl) {
    incomeEntryCountEl.textContent = incomes.length
      ? `From ${incomes.length} ${incomes.length === 1 ? "entry" : "entries"}`
      : "No income entries yet";
  }
  if (!incomeHistoryList) return;

  if (!incomes.length) {
    incomeHistoryList.innerHTML = `<p class="helper-text">No additional income recorded for this month.</p>`;
    return;
  }

  incomeHistoryList.innerHTML = `
    <div class="income-history-row income-history-head" aria-hidden="true">
      <span>Date</span>
      <span>Amount</span>
      <span>Remarks</span>
      <span>Actions</span>
    </div>
    ${incomes.map(income => {
      const dateValue = new Date(income.date).toISOString().split("T")[0];
      return `
        <div class="income-history-row">
          <span>${formatFullDate(dateValue)}</span>
          <strong>${formatCurrency(income.amount)}</strong>
          <span>${escapeHtml(income.remarks || "No remarks")}</span>
          <div class="income-history-actions">
            <button class="ghost-btn compact" type="button" onclick="openIncomeModal('${income._id}', ${Number(income.amount) || 0}, '${dateValue}', '${escapeJsString(income.remarks || "")}')">
              <i data-lucide="pencil"></i>Edit
            </button>
            <button class="delete-btn compact" type="button" onclick="deleteIncome('${income._id}')">
              <i data-lucide="trash-2"></i>Delete
            </button>
          </div>
        </div>
      `;
    }).join("")}
  `;
  renderIcons();
}

function escapeJsString(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, "&quot;")
    .replace(/\r?\n/g, " ");
}

function getIncomeDateBounds(month = getSelectedBudgetMonth()) {
  const selectedMonth = /^\d{4}-\d{2}$/.test(month || "")
    ? month
    : getCurrentMonthInputValue();
  const { start, end } = getMonthDateRange(selectedMonth);
  return { month: selectedMonth, min: start, max: end };
}

function syncIncomeDateBounds() {
  if (!incomeDateInput) return getIncomeDateBounds();

  const bounds = getIncomeDateBounds();
  incomeDateInput.min = bounds.min;
  incomeDateInput.max = bounds.max;

  if (!incomeDateInput.value || incomeDateInput.value < bounds.min || incomeDateInput.value > bounds.max) {
    incomeDateInput.value = bounds.min;
  }

  return bounds;
}

function openIncomeModal(id = "", amount = "", date = "", remarks = "") {
  editingIncomeId = id || null;
  if (incomeModalTitle) incomeModalTitle.textContent = editingIncomeId ? "Edit Income" : "Add Income";
  if (incomeAmountInput) incomeAmountInput.value = amount || "";
  const bounds = syncIncomeDateBounds();
  if (incomeDateInput) {
    incomeDateInput.value = date && date >= bounds.min && date <= bounds.max
      ? date
      : bounds.min;
  }
  if (incomeRemarksInput) incomeRemarksInput.value = remarks || "";
  if (incomeModalStatusEl) incomeModalStatusEl.textContent = "";
  incomeModal?.classList.remove("hidden");
  incomeAmountInput?.focus();
  renderIcons();
}

function closeIncomeModal() {
  incomeModal?.classList.add("hidden");
  editingIncomeId = null;
  if (incomeModalStatusEl) incomeModalStatusEl.textContent = "";
}

async function refreshAfterIncomeChange(month = getSelectedBudgetMonth()) {
  await loadCurrentBudget();
  await loadBudgetAllocations();
  await loadMonthlyTrend();
  await updateDashboardKpis();
  await updateAiInsights(getSelectedInsightMonth());
  await loadForecast(getSelectedDashboardMonth());
  if (document.getElementById("view-financial-statement")?.classList.contains("active")) {
    await loadFinancialStatement();
  }
}

async function saveIncome() {
  const amount = Number(incomeAmountInput?.value || 0);
  const date = incomeDateInput?.value || "";
  const remarks = incomeRemarksInput?.value || "";
  const month = getSelectedBudgetMonth();

  if (!amount || amount <= 0 || !date) {
    if (incomeModalStatusEl) incomeModalStatusEl.textContent = "Amount and date are required.";
    return;
  }
  const bounds = syncIncomeDateBounds();
  if (date < bounds.min || date > bounds.max) {
    if (incomeModalStatusEl) {
      incomeModalStatusEl.textContent =
        `Income date must be within ${formatMonth(bounds.month)}. Select another month at the top to enter older income.`;
    }
    return;
  }

  try {
    const wasEditing = Boolean(editingIncomeId);
    if (incomeModalStatusEl) incomeModalStatusEl.textContent = "Saving income...";
    const path = editingIncomeId ? `/income/${encodeURIComponent(editingIncomeId)}` : "/income";
    const method = editingIncomeId ? "PUT" : "POST";
    const res = await authFetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, date, remarks, month })
    });
    await parseApiJsonResponse(res, "Failed to save income.");

    closeIncomeModal();
    await refreshAfterIncomeChange(month);
    showStatus(wasEditing ? "Additional income updated." : "Additional income added.", "success");
  } catch (error) {
    console.error("Income save error:", error);
    if (incomeModalStatusEl) incomeModalStatusEl.textContent = error.message || "Unable to save income.";
  }
}

async function deleteIncome(id) {
  if (!id || !confirm("Delete this additional income entry?")) return;

  try {
    setLoading(true, "Deleting income...");
    const res = await authFetch(`/income/${encodeURIComponent(id)}`, { method: "DELETE" });
    await parseApiJsonResponse(res, "Failed to delete income.");

    await refreshAfterIncomeChange(getSelectedBudgetMonth());
    showStatus("Additional income deleted.", "success");
  } catch (error) {
    console.error("Income delete error:", error);
    showStatus(error.message || "Unable to delete that income entry right now.", "error");
  } finally {
    setLoading(false);
  }
}

async function loadBudgetAllocations() {
  if (!budgetAllocationList) return;

  try {
    const res = await authFetch("/budget/monthly");
    const data = await res.json();

    if (!data || data.length === 0) {
      budgetAllocationList.innerHTML = `<p class="helper-text">No monthly budgets saved yet.</p>`;
      if (budgetAllocationToggleBtn) budgetAllocationToggleBtn.classList.add("hidden");
      return;
    }

    const sortedBudgets = data
      .slice()
      .sort((a, b) => String(b.month).localeCompare(String(a.month)));
    const visibleBudgets = showAllBudgetAllocations ? sortedBudgets : sortedBudgets.slice(0, 4);

    budgetAllocationList.innerHTML = visibleBudgets
      .map(budget => `
        <div class="budget-allocation-row">
          <span>${formatMonth(budget.month)}</span>
          <strong>${formatCurrency(budget.amount || 0)}</strong>
          <div class="budget-allocation-actions">
            <button class="ghost-btn compact" type="button" onclick="editBudgetAllocation('${budget.month}', ${Number(budget.amount) || 0})">
              <i data-lucide="pencil"></i>Update
            </button>
            <button class="delete-btn compact" type="button" onclick="deleteBudgetAllocation('${budget.month}')">
              <i data-lucide="trash-2"></i>Delete
            </button>
          </div>
        </div>
      `).join("");

    if (budgetAllocationToggleBtn) {
      const shouldShowToggle = sortedBudgets.length > 4;
      budgetAllocationToggleBtn.classList.toggle("hidden", !shouldShowToggle);
      budgetAllocationToggleBtn.textContent = showAllBudgetAllocations ? "Show Less" : "View All Budgets";
    }

    renderIcons();
  } catch (error) {
    console.error("Error loading budget allocations:", error);
    showStatus("Unable to load monthly budget allocations.", "error");
  }
}

async function editBudgetAllocation(month, amount) {
  selectedBudgetMonth = month;
  if (budgetMonthInput) budgetMonthInput.value = month;
  if (budgetValueInput) {
    budgetValueInput.value = amount || "";
    budgetValueInput.focus();
  }
  await loadCurrentBudget();
}

async function deleteBudgetAllocation(month) {
  if (!month || !confirm(`Delete the budget for ${formatMonth(month)}? Additional income entries for this month will also be deleted.`)) return;

  try {
    setLoading(true, "Deleting budget...");
    const res = await authFetch(`/budget/${encodeURIComponent(month)}`, {
      method: "DELETE"
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to delete budget");
    }

    if (selectedBudgetMonth === month) {
      if (budgetValueInput) budgetValueInput.value = "";
      await loadCurrentBudget();
    }

    await loadBudgetAllocations();
    await loadMonthlyTrend();
    await updateDashboardKpis();
    await updateAiInsights(getSelectedInsightMonth());
    const incomeText = data.deletedIncomeCount
      ? ` Removed ${data.deletedIncomeCount} income entr${data.deletedIncomeCount === 1 ? "y" : "ies"}.`
      : "";
    showStatus(`Budget deleted for ${formatMonth(month)}.${incomeText}`, "success");
  } catch (error) {
    console.error("Error deleting budget:", error);
    showStatus("Unable to delete that budget right now.", "error");
  } finally {
    setLoading(false);
  }
}
    

// ==============================
// EXPORT MONTHLY REPORT
// ==============================

async function exportMonthlyReport() {
  try {
    const month = reportMonthInput?.value || getCurrentMonthInputValue();
    setLoading(true, "Preparing your PDF report...");
    if (reportStatusEl) reportStatusEl.textContent = "Preparing your report...";
    const res = await authFetch(`/report/monthly?month=${encodeURIComponent(month)}`);

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
// FINANCIAL STATEMENT
// ==============================

function getAnalyticsQuery() {
  initializeDateFilters();
  const { fetchFromMonth, fetchToMonth } = getAnalyticsFetchRange();
  const params = new URLSearchParams();

  if (fetchFromMonth) params.set("fromMonth", fetchFromMonth);
  if (fetchToMonth) params.set("toMonth", fetchToMonth);

  return params.toString();
}

function getAnalyticsPeriod() {
  return analyticsPeriodSelect?.value || "monthly";
}

function getAnalyticsSelectedRange() {
  initializeDateFilters();
  return {
    fromMonth: analyticsFromMonthInput?.value || "",
    toMonth: analyticsToMonthInput?.value || ""
  };
}

function getAnalyticsFetchRange() {
  const { fromMonth, toMonth } = getAnalyticsSelectedRange();
  const period = getAnalyticsPeriod();

  if (period === "yearly" && fromMonth) {
    return {
      fetchFromMonth: shiftMonthInputValue(fromMonth, -12),
      fetchToMonth: toMonth
    };
  }

  return {
    fetchFromMonth: fromMonth,
    fetchToMonth: toMonth
  };
}

function getQuarterIndex(month) {
  const [, monthNumber] = month.split("-").map(Number);
  return Math.floor((monthNumber - 1) / 3) + 1;
}

function getQuarterKey(month) {
  const [year] = month.split("-").map(Number);
  return `${year}-Q${getQuarterIndex(month)}`;
}

function getQuarterLabel(month) {
  const [year] = month.split("-").map(Number);
  return `Q${getQuarterIndex(month)} ${year}`;
}

function getQuarterStartMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const quarterStart = Math.floor((monthNumber - 1) / 3) * 3 + 1;
  return `${year}-${String(quarterStart).padStart(2, "0")}`;
}

function getQuarterEndMonth(month) {
  return shiftMonthInputValue(getQuarterStartMonth(month), 2);
}

function getLatestFourQuarterRange() {
  const currentQuarterStart = getQuarterStartMonth(getCurrentMonthInputValue());
  const fromMonth = shiftMonthInputValue(currentQuarterStart, -9);
  const toMonth = getQuarterEndMonth(currentQuarterStart);
  return { fromMonth, toMonth };
}

function setAnalyticsPeriodDefaults(period = getAnalyticsPeriod()) {
  if (period === "quarterly") {
    const range = getLatestFourQuarterRange();
    if (analyticsFromMonthInput) analyticsFromMonthInput.value = range.fromMonth;
    if (analyticsToMonthInput) analyticsToMonthInput.value = range.toMonth;
    return;
  }

  const currentMonth = getCurrentMonthInputValue();
  if (analyticsToMonthInput) analyticsToMonthInput.value = currentMonth;
  if (analyticsFromMonthInput) analyticsFromMonthInput.value = shiftMonthInputValue(currentMonth, -3);
}

async function loadAnalytics() {
  if (!analyticsGridEl) return;

  try {
    updateAnalyticsHeaderContext();
    const { fromMonth, toMonth } = getAnalyticsSelectedRange();

    if (fromMonth && toMonth && fromMonth > toMonth) {
      showStatus("From month cannot be after the to month.", "error");
      return;
    }

    setLoading(true, "Loading analytics...");
    const query = getAnalyticsQuery();
    const res = await authFetch(`/api/analytics${query ? `?${query}` : ""}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load analytics");
    }

    renderAnalytics(data.rows || []);
  } catch (error) {
    console.error("Analytics error:", error);
    showStatus("Unable to load analytics right now.", "error");
  } finally {
    setLoading(false);
  }
}

function destroyAnalyticsCharts() {
  Object.values(analyticsCharts).forEach(chart => {
    if (chart) chart.destroy();
  });
  analyticsCharts = {};
}

function hasAnalyticsActivity(rows) {
  return rows.some(row =>
    Number(row.availableBudget || 0) !== 0 ||
    Number(row.additionalIncome || 0) !== 0 ||
    Number(row.expenses || 0) !== 0 ||
    Number(row.savings || 0) !== 0 ||
    Number(row.needs || 0) !== 0 ||
    Number(row.wants || 0) !== 0
  );
}

function getAnalyticsVisibleRows(rows) {
  const period = getAnalyticsPeriod();
  const { fromMonth, toMonth } = getAnalyticsSelectedRange();
  const sortedRows = [...rows].sort((a, b) => String(a.month || "").localeCompare(String(b.month || "")));

  if (period === "quarterly") {
    return aggregateAnalyticsRowsByQuarter(
      sortedRows.filter(row => (!fromMonth || row.month >= fromMonth) && (!toMonth || row.month <= toMonth))
    );
  }

  if (period === "yearly") {
    return buildAnalyticsYearOverYearRows(sortedRows, fromMonth, toMonth);
  }

  return sortedRows.filter(row => (!fromMonth || row.month >= fromMonth) && (!toMonth || row.month <= toMonth));
}

function createEmptyAnalyticsAggregate(id, label) {
  return {
    month: id,
    monthLabel: label,
    originalBudget: 0,
    additionalIncome: 0,
    availableBudget: 0,
    expenses: 0,
    savings: 0,
    needs: 0,
    wants: 0,
    wantsByCategory: {}
  };
}

function mergeAnalyticsBreakdown(target = {}, source = {}) {
  Object.entries(source || {}).forEach(([category, amount]) => {
    target[category] = (target[category] || 0) + (Number(amount) || 0);
  });
  return target;
}

function aggregateAnalyticsRowsByQuarter(rows) {
  const quarterMap = new Map();

  rows.forEach(row => {
    const key = getQuarterKey(row.month);
    if (!quarterMap.has(key)) {
      quarterMap.set(key, createEmptyAnalyticsAggregate(key, getQuarterLabel(row.month)));
    }

    const aggregate = quarterMap.get(key);
    aggregate.originalBudget += Number(row.originalBudget) || 0;
    aggregate.additionalIncome += Number(row.additionalIncome) || 0;
    aggregate.availableBudget += Number(row.availableBudget) || 0;
    aggregate.expenses += Number(row.expenses) || 0;
    aggregate.savings += Number(row.savings) || 0;
    aggregate.needs += Number(row.needs) || 0;
    aggregate.wants += Number(row.wants) || 0;
    mergeAnalyticsBreakdown(aggregate.wantsByCategory, row.wantsByCategory);
  });

  return Array.from(quarterMap.values());
}

function buildAnalyticsYearOverYearRows(rows, fromMonth, toMonth) {
  const rowMap = new Map(rows.map(row => [row.month, row]));

  return rows
    .filter(row => (!fromMonth || row.month >= fromMonth) && (!toMonth || row.month <= toMonth))
    .map(row => {
      const comparisonMonth = shiftMonthInputValue(row.month, -12);
      const comparison = rowMap.get(comparisonMonth) || null;
      return {
        ...row,
        comparison,
        comparisonMonth,
        monthLabel: formatMonthName(row.month)
      };
    });
}

function getAnalyticsChangePeriodLabel() {
  const period = getAnalyticsPeriod();
  if (period === "quarterly") return "QoQ";
  if (period === "yearly") return "YoY";
  return "MoM";
}

function updateAnalyticsHeaderContext() {
  const period = getAnalyticsPeriod();
  const content = {
    monthly: {
      description: "Analyze month-to-month changes across budget, income, expenses, savings, needs, and wants.",
      badge: "MoM Analysis - Latest 4 months"
    },
    quarterly: {
      description: "Review quarter-over-quarter performance and identify longer-term spending patterns.",
      badge: "QoQ Analysis - Latest 4 quarters"
    },
    yearly: {
      description: "Compare current performance against the same period last year to measure financial growth and stability.",
      badge: "YoY Analysis - Same months compared with previous year"
    }
  }[period] || {};

  if (analyticsPageDescriptionEl) analyticsPageDescriptionEl.textContent = content.description || "";
  if (analyticsContextBadgeEl) analyticsContextBadgeEl.textContent = content.badge || "";
}

function getAnalyticsMetricChange(rows, key, positiveIsGood = true) {
  const period = getAnalyticsPeriod();
  if (!rows.length) return null;

  if (period === "yearly") {
    const latestRow = rows[rows.length - 1];
    return calculateAnalyticsPercentChange(
      Number(latestRow[key]) || 0,
      latestRow.comparison ? Number(latestRow.comparison[key]) || 0 : null,
      positiveIsGood,
      true
    );
  }

  if (rows.length < 2) return null;
  return calculateAnalyticsPercentChange(
    Number(rows[rows.length - 1][key]) || 0,
    Number(rows[rows.length - 2][key]) || 0,
    positiveIsGood
  );
}

function calculateAnalyticsPercentChange(currentValue, previousValue, positiveIsGood = true, requirePrevious = false) {
  if (previousValue === null || previousValue === undefined) {
    return requirePrevious ? { label: "Insufficient data", tone: "neutral", insufficient: true } : null;
  }

  if (previousValue === 0) {
    if (currentValue === 0) return null;
    const percent = currentValue > 0 ? 100 : -100;
    const improved = positiveIsGood ? percent >= 0 : percent <= 0;
    return {
      label: percent > 0 ? `\u2191 ${percent}%` : `\u2193 ${Math.abs(percent)}%`,
      color: improved ? "#16a34a" : "#d97706",
      tone: improved ? "positive" : "negative"
    };
  }

  const changeAmount = currentValue - previousValue;
  const percent = Math.round((changeAmount / Math.abs(previousValue)) * 100);
  const improved = positiveIsGood ? percent >= 0 : percent <= 0;

  return {
    label: percent > 0 ? `\u2191 ${percent}%` : percent < 0 ? `\u2193 ${Math.abs(percent)}%` : "0%",
    color: improved ? "#16a34a" : "#d97706",
    tone: improved ? "positive" : "negative"
  };
}

function getAnalyticsMetricChanges(rows) {
  return {
    budget: getAnalyticsMetricChange(rows, "availableBudget", true),
    income: getAnalyticsMetricChange(rows, "additionalIncome", true),
    expenses: getAnalyticsMetricChange(rows, "expenses", false),
    savings: getAnalyticsMetricChange(rows, "savings", true),
    needs: getAnalyticsMetricChange(rows, "needs", false),
    wants: getAnalyticsMetricChange(rows, "wants", false)
  };
}

function updateAnalyticsSummaryStrip(rows) {
  if (!analyticsSummaryStripEl) return;

  const changeLabel = getAnalyticsChangePeriodLabel();
  const changes = getAnalyticsMetricChanges(rows);

  analyticsSummaryStripEl.classList.toggle("hidden", !rows.length);

  Object.entries(changes).forEach(([summaryKey, change]) => {
    const element = analyticsSummaryEls[summaryKey];
    const card = element?.closest(".analytics-summary-card");
    if (!element || !card) return;

    card.classList.remove("positive", "negative", "neutral");

    if (!change) {
      element.textContent = "Insufficient data";
      card.classList.add("neutral");
      return;
    }

    element.textContent = change.insufficient ? "Insufficient data" : `${change.label} ${changeLabel}`;
    card.classList.add(change.tone || "neutral");
  });
}

function updateAnalyticsInsights(rows) {
  if (!analyticsInsightsCardEl || !analyticsInsightsListEl) return;

  const changes = getAnalyticsMetricChanges(rows);
  const changeLabel = getAnalyticsChangePeriodLabel();
  const insights = [];

  if (changes.expenses && !changes.expenses.insufficient) {
    insights.push({
      tone: changes.expenses.tone === "positive" ? "positive" : "concern",
      text: changes.expenses.tone === "positive"
        ? `Expenses decreased compared to the previous ${changeLabel} period.`
        : `Expenses increased compared to the previous ${changeLabel} period.`
    });
  }

  if (changes.savings && !changes.savings.insufficient) {
    insights.push({
      tone: changes.savings.tone === "positive" ? "positive" : "concern",
      text: changes.savings.tone === "positive"
        ? `Savings improved compared to the previous ${changeLabel} period.`
        : `Savings declined compared to the previous ${changeLabel} period.`
    });
  }

  if (changes.wants && !changes.wants.insufficient) {
    insights.push({
      tone: changes.wants.tone === "positive" ? "positive" : "concern",
      text: changes.wants.tone === "positive"
        ? "Wants spending reduced, which supports stronger savings."
        : "Wants spending increased and may need review."
    });
  }

  if (changes.income && !changes.income.insufficient && changes.income.tone === "positive") {
    insights.push({
      tone: "positive",
      text: "Additional income improved this period."
    });
  }

  if (!insights.length) {
    insights.push({
      tone: "concern",
      text: "Insufficient comparison data for reliable insights."
    });
  }

  analyticsInsightsListEl.innerHTML = insights.slice(0, 4)
    .map(insight => `<li class="${insight.tone}">${escapeHtml(insight.text)}</li>`)
    .join("");
  analyticsInsightsCardEl.classList.toggle("hidden", !rows.length);
}

function renderAnalytics(rows) {
  destroyAnalyticsCharts();

  const visibleRows = getAnalyticsVisibleRows(rows);
  const hasData = visibleRows.length > 0 && hasAnalyticsActivity(visibleRows);
  if (analyticsEmptyStateEl) analyticsEmptyStateEl.classList.toggle("hidden", hasData);
  if (analyticsGridEl) analyticsGridEl.classList.toggle("hidden", !hasData);
  if (analyticsSummarySectionEl) analyticsSummarySectionEl.classList.toggle("hidden", !hasData);
  if (analyticsInsightsCardEl) analyticsInsightsCardEl.classList.toggle("hidden", !hasData);

  if (!hasData) {
    setAnalyticsCurrentMonthNotes(false);
    updateAnalyticsSummaryStrip([]);
    updateAnalyticsInsights([]);
    return;
  }

  updateAnalyticsSummaryStrip(visibleRows);
  updateAnalyticsInsights(visibleRows);

  const labels = visibleRows.map(row => row.monthLabel || formatMonth(row.month));
  const currentMonth = getCurrentMonthInputValue();
  const latestDisplayedMonth = visibleRows[visibleRows.length - 1]?.month || "";
  const currentMonthIndex = getAnalyticsPeriod() === "monthly" && latestDisplayedMonth === currentMonth
    ? visibleRows.findIndex(row => row.month === currentMonth)
    : -1;
  const hasCurrentMonth = currentMonthIndex >= 0;

  setAnalyticsCurrentMonthNotes(hasCurrentMonth);

  renderAnalyticsTrendChart("budget", "analyticsBudgetChart", labels, visibleRows, {
    label: "Monthly Available Budget",
    key: "availableBudget",
    barColor: "rgba(29, 78, 216, 0.82)",
    borderColor: "#1d4ed8",
    lineColor: "#0f766e",
    positiveIsGood: true
  });
  renderAnalyticsTrendChart("income", "analyticsIncomeChart", labels, visibleRows, {
    label: "Additional Income",
    key: "additionalIncome",
    barColor: "rgba(20, 184, 166, 0.78)",
    borderColor: "#0f766e",
    lineColor: "#2563eb",
    positiveIsGood: true
  });
  renderAnalyticsTrendChart("expenses", "analyticsExpenseChart", labels, visibleRows, {
    label: "Expenses",
    key: "expenses",
    barColor: "rgba(217, 119, 6, 0.78)",
    borderColor: "#d97706",
    lineColor: "#0f766e",
    positiveIsGood: false,
    currentMonthIndex,
    currentMonthKind: "expenses"
  });
  renderAnalyticsTrendChart("savings", "analyticsSavingsChart", labels, visibleRows, {
    label: "Savings",
    key: "savings",
    barColor: visibleRows.map(row => Number(row.savings || 0) < 0 ? "rgba(220, 38, 38, 0.78)" : "rgba(22, 163, 74, 0.78)"),
    borderColor: visibleRows.map(row => Number(row.savings || 0) < 0 ? "#dc2626" : "#16a34a"),
    lineColor: "#2563eb",
    positiveIsGood: true,
    currentMonthIndex,
    currentMonthKind: "savings"
  });
  renderAnalyticsTrendChart("needs", "analyticsNeedsChart", labels, visibleRows, {
    label: "Needs",
    key: "needs",
    barColor: "rgba(37, 99, 235, 0.72)",
    borderColor: "#2563eb",
    lineColor: "#0f766e",
    positiveIsGood: false
  });
  renderAnalyticsTrendChart("wants", "analyticsWantsChart", labels, visibleRows, {
    label: "Wants",
    key: "wants",
    barColor: "rgba(124, 58, 237, 0.70)",
    borderColor: "#7c3aed",
    lineColor: "#d97706",
    positiveIsGood: false,
    tooltipBreakdownKey: "wantsByCategory"
  });
  renderAnalyticsNeedsWantsChart(labels, visibleRows);
}

function setAnalyticsCurrentMonthNotes(show) {
  analyticsExpenseCurrentNoteEl?.classList.toggle("hidden", !show);
  analyticsSavingsCurrentNoteEl?.classList.toggle("hidden", !show);
}

function getAnalyticsScaleBounds(values) {
  const numericValues = values.map(value => Number(value) || 0);
  const minValue = Math.min(...numericValues, 0);
  const maxValue = Math.max(...numericValues, 0);

  return {
    suggestedMin: minValue < 0 ? minValue * 1.18 : 0,
    suggestedMax: maxValue > 0 ? maxValue * 1.22 : 1000
  };
}

function getAnalyticsTrendChanges(rows, key, positiveIsGood = true) {
  const period = getAnalyticsPeriod();

  return rows.map((row, index) => {
    const currentValue = Number(row[key]) || 0;

    if (period === "yearly") {
      return calculateAnalyticsPercentChange(
        currentValue,
        row.comparison ? Number(row.comparison[key]) || 0 : null,
        positiveIsGood,
        true
      );
    }

    if (index === 0) return null;

    return calculateAnalyticsPercentChange(
      currentValue,
      Number(rows[index - 1][key]) || 0,
      positiveIsGood
    );
  });
}

function createAnalyticsMomLabelPlugin(momChanges, datasetIndex = 0) {
  return {
    id: `analyticsMomLabels-${Math.random().toString(36).slice(2)}`,
    afterDatasetsDraw(chart) {
      const options = chart.options.plugins?.analyticsMomLabels;
      if (!options?.enabled) return;

      const { ctx, chartArea, scales } = chart;
      const barMeta = chart.getDatasetMeta(options.datasetIndex ?? datasetIndex);
      const fontSize = chart.width < 520 ? 9 : 10;

      ctx.save();
      ctx.font = `800 ${fontSize}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      barMeta.data.forEach((bar, dataIndex) => {
        const change = momChanges[dataIndex];
        if (!change) return;

        if (change.insufficient) return;

        const targetDataset = chart.data.datasets[options.datasetIndex ?? datasetIndex];
        const rawValue = Number(targetDataset?.data?.[dataIndex]) || 0;
        const zeroY = scales.y.getPixelForValue(0);
        const labelY = rawValue < 0
          ? Math.min(zeroY - 6, chartArea.bottom - 6)
          : Math.max(bar.y - 8, chartArea.top + fontSize + 2);

        ctx.fillStyle = change.color || "#64748b";
        ctx.fillText(change.label, bar.x, labelY);
      });

      ctx.restore();
    }
  };
}

function getAnalyticsCurrentMonthContext(config, values) {
  if (!["expenses", "savings"].includes(config.currentMonthKind)) return null;
  if (!Number.isInteger(config.currentMonthIndex) || config.currentMonthIndex < 0) return null;
  if (config.currentMonthIndex >= values.length) return null;

  if (config.currentMonthKind === "expenses") {
    return {
      dataIndex: config.currentMonthIndex,
      label: "Current Expenses (So Far)",
      note: "This value may increase before month-end."
    };
  }

  return {
    dataIndex: config.currentMonthIndex,
    label: "Current Savings (So Far)",
    note: "This value may change before month-end."
  };
}

function getAnalyticsCurrentMonthBarColor(config, fallbackColor) {
  if (config.currentMonthKind === "expenses") {
    return "rgba(217, 119, 6, 0.48)";
  }

  if (config.currentMonthKind === "savings") {
    return "rgba(37, 99, 235, 0.46)";
  }

  return fallbackColor;
}

function getAnalyticsDatasetColors(config, values) {
  const currentContext = getAnalyticsCurrentMonthContext(config, values);
  const backgroundColor = values.map((_, index) => {
    const baseColor = Array.isArray(config.barColor) ? config.barColor[index] : config.barColor;
    return currentContext?.dataIndex === index
      ? getAnalyticsCurrentMonthBarColor(config, baseColor)
      : baseColor;
  });
  const borderColor = values.map((_, index) => {
    const baseColor = Array.isArray(config.borderColor) ? config.borderColor[index] : config.borderColor;
    return currentContext?.dataIndex === index ? "#2563eb" : baseColor;
  });
  const borderWidth = values.map((_, index) =>
    currentContext?.dataIndex === index ? 2 : 1
  );

  return { backgroundColor, borderColor, borderWidth, currentContext };
}

function getTopAnalyticsBreakdownLines(breakdown = {}) {
  const entries = Object.entries(breakdown || {})
    .map(([category, amount]) => [category, Number(amount) || 0])
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  if (!entries.length) return [];

  const topEntries = entries.slice(0, 4);
  const otherTotal = entries.slice(4).reduce((sum, [, amount]) => sum + amount, 0);
  const lines = [
    "Top Wants Expenses:",
    ...topEntries.map(([category, amount]) => `• ${formatDisplayText(category)}: ${formatCurrency(amount)}`)
  ];

  if (otherTotal > 0) {
    lines.push(`• Other: ${formatCurrency(otherTotal)}`);
  }

  return lines;
}

function renderAnalyticsTrendChart(chartKey, canvasId, labels, rows, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (getAnalyticsPeriod() === "yearly") {
    renderAnalyticsYearlyGroupedChart(chartKey, canvasId, labels, rows, config);
    return;
  }

  const values = rows.map(row => Number(row[config.key]) || 0);
  const bounds = getAnalyticsScaleBounds(values);
  const momChanges = getAnalyticsTrendChanges(rows, config.key, config.positiveIsGood !== false);
  const momLabelPlugin = createAnalyticsMomLabelPlugin(momChanges);
  const colors = getAnalyticsDatasetColors(config, values);

  analyticsCharts[chartKey] = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: config.label,
          data: values,
          backgroundColor: colors.backgroundColor,
          borderColor: colors.borderColor,
          borderWidth: colors.borderWidth,
          borderRadius: 0,
          borderSkipped: false,
          maxBarThickness: 30
        },
        {
          type: "line",
          label: `${config.label} Trend`,
          data: values,
          borderColor: config.lineColor,
          backgroundColor: config.lineColor,
          borderDash: [3, 4],
          borderWidth: 1.5,
          pointBackgroundColor: config.lineColor,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          fill: false,
          tension: 0,
          order: 0
        }
      ]
    },
    options: getAnalyticsChartOptions(bounds, momChanges, colors.currentContext, {
      rows,
      breakdownKey: config.tooltipBreakdownKey,
      changeLabel: getAnalyticsChangePeriodLabel()
    }),
    plugins: [momLabelPlugin]
  });
}

function getAnalyticsBarColorForIndex(colorConfig, index, fallback) {
  return Array.isArray(colorConfig) ? colorConfig[index] || fallback : colorConfig || fallback;
}

function renderAnalyticsYearlyGroupedChart(chartKey, canvasId, labels, rows, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const currentValues = rows.map(row => Number(row[config.key]) || 0);
  const previousValues = rows.map(row =>
    row.comparison ? Number(row.comparison[config.key]) || 0 : null
  );
  const bounds = getAnalyticsScaleBounds([
    ...currentValues,
    ...previousValues.map(value => value === null ? 0 : value)
  ]);
  const yoyChanges = getAnalyticsTrendChanges(rows, config.key, config.positiveIsGood !== false);
  const yoyLabelPlugin = createAnalyticsMomLabelPlugin(yoyChanges, 1);
  const currentBackgroundColor = currentValues.map((_, index) =>
    getAnalyticsBarColorForIndex(config.barColor, index, "rgba(37, 99, 235, 0.74)")
  );
  const currentBorderColor = currentValues.map((_, index) =>
    getAnalyticsBarColorForIndex(config.borderColor, index, "#2563eb")
  );

  analyticsCharts[chartKey] = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Previous Year",
          data: previousValues,
          backgroundColor: "rgba(148, 163, 184, 0.58)",
          borderColor: "#94a3b8",
          borderWidth: 1,
          borderRadius: 0,
          borderSkipped: false,
          categoryPercentage: 0.56,
          barPercentage: 0.9,
          maxBarThickness: 26
        },
        {
          label: "Current Year",
          data: currentValues,
          backgroundColor: currentBackgroundColor,
          borderColor: currentBorderColor,
          borderWidth: 1,
          borderRadius: 0,
          borderSkipped: false,
          categoryPercentage: 0.56,
          barPercentage: 0.9,
          maxBarThickness: 26
        }
      ]
    },
    options: getAnalyticsYearlyChartOptions(bounds, yoyChanges, {
      rows,
      key: config.key,
      breakdownKey: config.tooltipBreakdownKey
    }),
    plugins: [yoyLabelPlugin]
  });
}

function getAnalyticsChartOptions(bounds, momChanges = null, currentMonthContext = null, tooltipConfig = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: "easeOutQuart"
    },
    plugins: {
      legend: getChartLegendConfig(),
      analyticsMomLabels: {
        enabled: Boolean(momChanges)
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.94)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: ctx => {
            if (currentMonthContext && ctx.datasetIndex === 0 && ctx.dataIndex === currentMonthContext.dataIndex) {
              return `${currentMonthContext.label}: ${formatCurrency(ctx.raw)}`;
            }

            return `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`;
          },
          afterBody(items) {
            const lines = [];
            const currentItem = currentMonthContext
              ? items.find(ctx => ctx.datasetIndex === 0 && ctx.dataIndex === currentMonthContext.dataIndex)
              : null;
            const item = items.find(ctx => ctx.datasetIndex === 0) || items[0];

            if (tooltipConfig.breakdownKey && item) {
              lines.push(
                ...getTopAnalyticsBreakdownLines(
                  tooltipConfig.rows?.[item.dataIndex]?.[tooltipConfig.breakdownKey] || {}
                )
              );
            }

            if (currentItem) {
              lines.push(currentMonthContext.note);
            }

            if (!momChanges) return lines;
            const change = item ? momChanges[item.dataIndex] : null;
            if (change) {
              lines.push(`${tooltipConfig.changeLabel || "MoM"}: ${change.label}`);
            }

            return lines;
          }
        }
      }
    },
    layout: {
      padding: {
        top: momChanges ? 28 : 0
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMin: bounds.suggestedMin,
        suggestedMax: bounds.suggestedMax,
        border: { display: false },
        grid: { color: "rgba(228, 231, 236, 0.72)" },
        ticks: {
          ...getChartTickConfig(),
          callback: value => formatCurrency(value)
        }
      },
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: getChartTickConfig()
      }
    }
  };
}

function getAnalyticsYearlyChartOptions(bounds, yoyChanges = null, tooltipConfig = {}) {
  const legendConfig = getChartLegendConfig();
  legendConfig.labels.usePointStyle = false;
  legendConfig.labels.boxWidth = 12;

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: "easeOutQuart"
    },
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: legendConfig,
      analyticsMomLabels: {
        enabled: Boolean(yoyChanges),
        datasetIndex: 1
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.94)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          title(items) {
            const item = items[0];
            const row = tooltipConfig.rows?.[item?.dataIndex];
            if (!row) return item?.label || "";
            return `${formatMonth(row.comparisonMonth)} vs ${formatMonth(row.month)}`;
          },
          label(ctx) {
            const row = tooltipConfig.rows?.[ctx.dataIndex];
            if (ctx.datasetIndex === 0 && !row?.comparison) {
              return "Previous Year value: Insufficient data";
            }

            const value = ctx.raw === null || ctx.raw === undefined ? 0 : Number(ctx.raw) || 0;
            return `${ctx.dataset.label} value: ${formatCurrency(value)}`;
          },
          afterBody(items) {
            const item = items.find(ctx => ctx.datasetIndex === 1) || items[0];
            const lines = [];
            const row = tooltipConfig.rows?.[item?.dataIndex];
            const change = item ? yoyChanges?.[item.dataIndex] : null;

            if (tooltipConfig.breakdownKey && row) {
              lines.push(...getTopAnalyticsBreakdownLines(row[tooltipConfig.breakdownKey] || {}));
            }

            if (!row?.comparison) {
              lines.push("YoY: Insufficient data");
              return lines;
            }

            if (change) {
              lines.push(`YoY: ${change.label}`);
            }

            return lines;
          }
        }
      }
    },
    layout: {
      padding: {
        top: yoyChanges ? 28 : 0
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMin: bounds.suggestedMin,
        suggestedMax: bounds.suggestedMax,
        border: { display: false },
        grid: { color: "rgba(228, 231, 236, 0.72)" },
        ticks: {
          ...getChartTickConfig(),
          callback: value => formatCurrency(value)
        }
      },
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: getChartTickConfig()
      }
    }
  };
}

function renderAnalyticsNeedsWantsChart(labels, rows) {
  const canvas = document.getElementById("analyticsNeedsWantsChart");
  if (!canvas) return;

  const needsValues = rows.map(row => Number(row.needs) || 0);
  const wantsValues = rows.map(row => Number(row.wants) || 0);
  const bounds = getAnalyticsScaleBounds([...needsValues, ...wantsValues]);

  analyticsCharts.needsWants = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Needs",
          data: needsValues,
          backgroundColor: "rgba(37, 99, 235, 0.74)",
          borderColor: "#2563eb",
          borderWidth: 1,
          borderRadius: 0,
          borderSkipped: false,
          categoryPercentage: 0.32,
          barPercentage: 0.98,
          maxBarThickness: 24
        },
        {
          label: "Wants",
          data: wantsValues,
          backgroundColor: "rgba(124, 58, 237, 0.68)",
          borderColor: "#7c3aed",
          borderWidth: 1,
          borderRadius: 0,
          borderSkipped: false,
          categoryPercentage: 0.32,
          barPercentage: 0.98,
          maxBarThickness: 24
        }
      ]
    },
    options: getAnalyticsChartOptions(bounds)
  });
}

function getFinancialStatementQuery() {
  initializeDateFilters();
  const fromMonth = statementFromMonthInput?.value || "";
  const toMonth = statementToMonthInput?.value || "";
  const params = new URLSearchParams();

  if (fromMonth) params.set("fromMonth", fromMonth);
  if (toMonth) params.set("toMonth", toMonth);

  return params.toString();
}

async function loadFinancialStatement() {
  if (!statementTableBody) return;

  try {
    const query = getFinancialStatementQuery();

    if (statementFromMonthInput?.value && statementToMonthInput?.value &&
      statementFromMonthInput.value > statementToMonthInput.value) {
      showStatus("From month cannot be after the to month.", "error");
      return;
    }

    setLoading(true, "Loading financial statement...");
    const res = await authFetch(`/api/financial-statement${query ? `?${query}` : ""}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load financial statement");
    }

    renderFinancialStatement(data);
  } catch (error) {
    console.error("Financial statement error:", error);
    showStatus("Unable to load financial statement right now.", "error");
  } finally {
    setLoading(false);
  }
}

function renderStatementAmount(amount) {
  const value = Number(amount) || 0;
  const className = value < 0 ? "amount-negative" : value > 0 ? "amount-positive" : "amount-neutral";
  return `<span class="${className}">${formatCurrency(value)}</span>`;
}

function renderFinancialStatement(data) {
  const rows = data.rows || [];
  const summary = data.summary || {};

  if (statementTotalBudgetEl) statementTotalBudgetEl.textContent = formatCurrency(summary.totalBudget || 0);
  if (statementTotalExpensesEl) statementTotalExpensesEl.textContent = formatCurrency(summary.totalExpenses || 0);
  if (statementTotalSavingsEl) {
    statementTotalSavingsEl.textContent = formatCurrency(summary.totalSavings || 0);
    statementTotalSavingsEl.classList.toggle("statement-negative", Number(summary.totalSavings) < 0);
  }
  if (statementAverageSavingsEl) {
    statementAverageSavingsEl.textContent = formatCurrency(summary.averageMonthlySavings || 0);
    statementAverageSavingsEl.classList.toggle("statement-negative", Number(summary.averageMonthlySavings) < 0);
  }

  statementTableBody.innerHTML = rows.map(row => `
    <tr class="${row.monthlySavings < 0 || row.cumulativeSavings < 0 ? "statement-row-warning" : ""}">
      <td data-label="Month"><strong>${escapeHtml(row.monthLabel || formatMonth(row.month))}</strong></td>
      <td data-label="Monthly Available Budget">${formatCurrency(row.monthlyBudget)}</td>
      <td data-label="Monthly Expenses">${formatCurrency(row.monthlyExpenses)}</td>
      <td data-label="Monthly Savings">${renderStatementAmount(row.monthlySavings)}</td>
      <td data-label="Cumulative Available Budget">${formatCurrency(row.cumulativeBudget)}</td>
      <td data-label="Cumulative Expenses">${formatCurrency(row.cumulativeExpenses)}</td>
      <td data-label="Cumulative Savings">${renderStatementAmount(row.cumulativeSavings)}</td>
    </tr>
  `).join("");

  if (statementEmptyStateEl) {
    statementEmptyStateEl.classList.toggle("hidden", rows.length > 0);
  }
}

async function exportFinancialStatementPdf() {
  try {
    const query = getFinancialStatementQuery();

    if (statementFromMonthInput?.value && statementToMonthInput?.value &&
      statementFromMonthInput.value > statementToMonthInput.value) {
      showStatus("From month cannot be after the to month.", "error");
      return;
    }

    setLoading(true, "Preparing financial statement PDF...");
    const res = await authFetch(`/api/financial-statement/pdf${query ? `?${query}` : ""}`);

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Failed to export financial statement");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const suffix = statementFromMonthInput?.value && statementToMonthInput?.value
      ? `${statementFromMonthInput.value}-to-${statementToMonthInput.value}`
      : getCurrentMonthInputValue();

    link.href = url;
    link.download = `financial-statement-${suffix}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showStatus("Financial statement downloaded successfully.", "success");
  } catch (error) {
    console.error("Financial statement export error:", error);
    showStatus("Unable to export financial statement right now.", "error");
  } finally {
    setLoading(false);
  }
}

// ==============================
// SMART INSIGHTS LOGIC
// ==============================

async function updateAiInsights(month = getSelectedInsightMonth()) {
  try {
    const selectedMonth = month || getCurrentMonthInputValue();
    if (insightMonthInput && insightMonthInput.value !== selectedMonth) {
      insightMonthInput.value = selectedMonth;
    }

    const res = await authFetch(`/expenses/insights?month=${encodeURIComponent(selectedMonth)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to load insights");
    }

    renderInsightText(insightTopCategoryEl, data.topCategoryInsight || "No spending data yet.");
    renderInsightText(insightMonthlyTrendEl, data.monthlyTrendInsight || "No monthly trend yet.");
    renderInsightText(insightBudgetWarningEl, data.budgetWarningInsight || "No budget warning yet.", {
      dangerNumbers: Boolean(data.isBudgetForecastOverrun)
    });
    if (insightOverspendingAlertEl) {
      renderInsightText(insightOverspendingAlertEl, data.overspendingAlert || "No overspending data yet.", {
        dangerNumbers: Boolean(data.isOverspending)
      });
    }
    renderInsightText(insightCategoryAlertEl, data.categoryOverspendingAlert || "No category overspending alert yet.", {
      dangerNumbers: Boolean(data.hasCategoryOverspendingAlert)
    });
    renderInsightText(insightSavingsEl, data.savingsInsight || "No savings recommendation yet.");
    renderInsightText(insightForecastedSavingsEl, data.forecastedMonthEndSavingsInsight || "No forecasted savings insight yet.");
    renderInsightText(insightSpendingEfficiencyEl, data.spendingEfficiencyInsight || "No spending efficiency insight yet.");
    renderInsightText(insightPatternEl, data.patternInsight || "No spending pattern yet.");
    if (dashboardTopInsightEl) dashboardTopInsightEl.textContent = data.topCategoryInsight || "No spending insights yet. Add expenses to unlock analysis.";
  } catch (error) {
    console.error("AI insights error:", error);
    setEmptyAiInsights();
  }
}

function renderInsightText(element, text, options = {}) {
  if (!element) return;

  element.textContent = "";
  const numberPattern = /(₹[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?%)/g;
  const numberClass = options.dangerNumbers ? "insight-number danger" : "insight-number";
  let lastIndex = 0;

  String(text).replace(numberPattern, (match, _value, offset) => {
    if (offset > lastIndex) {
      element.appendChild(document.createTextNode(String(text).slice(lastIndex, offset)));
    }

    const numberEl = document.createElement("span");
    numberEl.className = numberClass;
    numberEl.textContent = match;
    element.appendChild(numberEl);
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < String(text).length) {
    element.appendChild(document.createTextNode(String(text).slice(lastIndex)));
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
  const averageWindowDays = Math.max(daysPassed, 7);
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const forecast = Math.round((currentTotal / averageWindowDays) * totalDays);
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

function getFinancialHealthGrade(score) {
  if (score >= 90) {
    return {
      grade: "Excellent",
      status: "Outstanding Financial Score",
      color: "green"
    };
  }
  if (score >= 80) {
    return {
      grade: "Very Good",
      status: "Good Financial Position",
      color: "teal"
    };
  }
  if (score >= 70) {
    return {
      grade: "Good",
      status: "On Track",
      color: "blue"
    };
  }
  if (score >= 60) {
    return {
      grade: "Fair",
      status: "Needs Attention",
      color: "amber"
    };
  }
  if (score >= 40) {
    return {
      grade: "At Risk",
      status: "Budget Concerns",
      color: "orange"
    };
  }
  return {
    grade: "Critical",
    status: "Immediate Action Required",
    color: "red"
  };
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
  if (insightOverspendingAlertEl) {
    insightOverspendingAlertEl.textContent = "No overspending data yet.";
  }
  if (insightCategoryAlertEl) insightCategoryAlertEl.textContent = "No category overspending alert yet.";
  if (insightSavingsEl) insightSavingsEl.textContent = "No savings recommendation yet.";
  if (insightForecastedSavingsEl) insightForecastedSavingsEl.textContent = "No forecasted savings insight yet.";
  if (insightSpendingEfficiencyEl) insightSpendingEfficiencyEl.textContent = "No spending efficiency insight yet.";
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

function formatMonthName(monthStr) {
  const [, month] = monthStr.split("-");
  return new Date(2000, month - 1).toLocaleString("default", {
    month: "short"
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

async function loadForecast(month = getCurrentMonthInputValue()) {
  try {
    const res = await authFetch(`/forecast?month=${encodeURIComponent(month)}`);
    const data = await res.json();

    if (forecastAmountEl) {
      forecastAmountEl.textContent = formatCurrency(data.projectedMonthEndSpending || 0);
    }

    if (forecastLabelEl) {
      forecastLabelEl.textContent = data.isEarlyEstimate
        ? "Early estimate projected month-end spending"
        : "Projected month-end spending";
    }

    if (forecastMessageEl) {
      forecastMessageEl.textContent = data.message || "Forecast is ready.";
    }

    if (dashboardForecastSummaryEl) {
      dashboardForecastSummaryEl.textContent = data.projectedMonthEndSpending
        ? formatCurrency(data.projectedMonthEndSpending)
        : "No forecast yet";
    }

    if (dashboardForecastChipEl) {
      const confidence = data.isEarlyEstimate ? "Low confidence" : "Normal confidence";
      dashboardForecastChipEl.textContent = `Risk: ${data.riskLevel || "No data"} • ${confidence}`;
      if (dashboardInsightForecastEl) {
        dashboardInsightForecastEl.textContent = data.isEarlyEstimate
          ? "Forecast confidence low"
          : "Forecast confidence normal";
      }
    }

    if (forecastAverageDailyEl) {
      forecastAverageDailyEl.textContent = formatCurrency(data.averageDailySpending || 0);
    }

    if (forecastRemainingBudgetEl) {
      forecastRemainingBudgetEl.textContent = formatCurrency(data.remainingBudget || 0);
    }

    if (forecastDaysTrackedEl) {
      forecastDaysTrackedEl.textContent = `${data.daysPassed || 0} of ${data.totalDays || 0}`;
    }

    if (forecastRiskLevelEl) {
      forecastRiskLevelEl.textContent = data.riskLevel || "No data";
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
  const month = getSelectedBudgetMonth();
  const amount = Number(document.getElementById("budgetValue")?.value || 0);
  if (!month || isNaN(amount) || amount <= 0) {
    showStatus("Please select a month and enter a valid positive budget amount.", "error");
    return;
  }

  try {
    setLoading(true, "Saving budget...");
    console.log("Saving budget allocation:", { month, amount });
    const res = await authFetch("/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, month })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to save budget");
    }

    await loadCurrentBudget();
    await loadBudgetAllocations();
    await loadMonthlyTrend();
    await updateAiInsights(getSelectedInsightMonth());
    showStatus(`Budget saved for ${formatMonth(month)}.`, "success");
  } catch (error) {
    console.error("Error saving budget:", error);
    showStatus("Unable to update the budget right now.", "error");
  } finally {
    setLoading(false);
  }
}

async function saveBudgetAllocations() {
  return setBudget();
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

window.addEventListener("popstate", () => {
  if (!dashboardPage.classList.contains("hidden")) {
    setActiveView(getRouteView(), { syncRoute: false });
  }
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

if (sidebarCollapseToggle) {
  sidebarCollapseToggle.addEventListener("click", () => {
    const isCollapsed = dashboardPage.classList.toggle("sidebar-collapsed");
    sidebarCollapseToggle.setAttribute("aria-expanded", String(!isCollapsed));
    sidebarCollapseToggle.setAttribute("aria-label", isCollapsed ? "Expand sidebar" : "Collapse sidebar");
    sidebarCollapseToggle.innerHTML = isCollapsed
      ? '<i data-lucide="panel-left-open"></i>'
      : '<i data-lucide="panel-left-close"></i>';
    renderIcons();
    setTimeout(() => {
      if (expenseChart) expenseChart.resize();
      if (barChart) barChart.resize();
      if (monthlyExpenseProgressChart) monthlyExpenseProgressChart.resize();
      if (monthlyChart) monthlyChart.resize();
      if (monthlyCategoryChart) monthlyCategoryChart.resize();
    }, 240);
  });
}

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
if (saveProfileBtn) saveProfileBtn.addEventListener("click", saveProfile);

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

if (receiptImageInput) {
  receiptImageInput.addEventListener("change", handleReceiptFileChange);
}

if (scanReceiptBtn) {
  scanReceiptBtn.addEventListener("click", scanReceipt);
}

if (retryReceiptBtn) {
  retryReceiptBtn.addEventListener("click", () => {
    receiptReviewPanel?.classList.add("hidden");
    scanReceipt();
  });
}

if (autofillReceiptBtn) {
  autofillReceiptBtn.addEventListener("click", applyReceiptToExpenseForm);
}

if (saveReceiptExpenseBtn) {
  saveReceiptExpenseBtn.addEventListener("click", saveReceiptExpense);
}

paytmStatementUploadBtn?.addEventListener("click", () => paytmStatementInput?.click());
paytmStatementInput?.addEventListener("change", handlePaytmStatementSelection);
confirmPaytmImportBtn?.addEventListener("click", importPaytmStatement);
closePaytmPreviewBtn?.addEventListener("click", closePaytmPreview);
cancelPaytmImportBtn?.addEventListener("click", closePaytmPreview);
paytmPreviewModal?.addEventListener("click", event => {
  if (event.target === paytmPreviewModal) closePaytmPreview();
});

if (getToken()) {
  showDashboard();
} else {
  showAuth("login");
}

renderIcons();
