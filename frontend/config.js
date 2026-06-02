window.SMART_EXPENSE_CONFIG = {
  API_BASE_URL:
    window.location.protocol === "file:"
      ? "http://localhost:5000"
      : window.location.origin
};
