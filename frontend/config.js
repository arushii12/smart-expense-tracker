/*
 * Frontend runtime configuration.
 * Chooses the backend base URL used by script.js for every API request.
 * Local file previews use the development server; hosted pages use their own origin.
 */
window.SMART_EXPENSE_CONFIG = {
  API_BASE_URL:
    window.location.protocol === "file:"
      ? "http://localhost:5000"
      : window.location.origin
};
