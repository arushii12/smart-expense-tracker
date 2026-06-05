const express = require("express");

const auth = require("../middleware/auth");
const Income = require("../models/Income");

const router = express.Router();

router.use(auth);

function sendSuccess(res, status, payload) {
  return res.status(status).json({
    success: true,
    ...payload
  });
}

function sendError(res, status, message, error) {
  const payload = {
    success: false,
    message
  };

  if (process.env.NODE_ENV !== "production" && error) {
    payload.error = error.message || String(error);
  }

  return res.status(status).json(payload);
}

function isValidMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ""))) return false;
  const [, month] = String(value).split("-").map(Number);
  return month >= 1 && month <= 12;
}

function isValidDate(value) {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime());
}

function getMonthFromDate(value) {
  const match = /^(\d{4})-(\d{2})-\d{2}/.exec(String(value || ""));
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function sanitizeRemarks(value) {
  return String(value || "").trim().slice(0, 160);
}

function isDateInMonth(date, month) {
  return getMonthFromDate(date) === month;
}

router.get("/", async (req, res) => {
  try {
    const month = req.query.month;
    if (!isValidMonth(month)) {
      return sendError(res, 400, "Please select a valid income month.");
    }

    const incomes = await Income.find({ userId: req.user.id, month }).sort({ date: 1 });
    const total = incomes.reduce((sum, income) => sum + Number(income.amount || 0), 0);

    return sendSuccess(res, 200, { month, total, incomes });
  } catch (error) {
    return sendError(res, 500, "Failed to load additional income", error);
  }
});

router.post("/", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const month = req.body.month || getMonthFromDate(req.body.date);
    const date = req.body.date;

    if (!isValidMonth(month)) {
      return sendError(res, 400, "Please select a valid income month.");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return sendError(res, 400, "Income amount must be greater than 0.");
    }
    if (!isValidDate(date)) {
      return sendError(res, 400, "Please select a valid income date.");
    }
    if (!isDateInMonth(date, month)) {
      return sendError(
        res,
        400,
        `Income date must be within ${month}. Select that month before saving income.`
      );
    }

    const income = await Income.create({
      userId: req.user.id,
      month,
      amount,
      date: new Date(date),
      remarks: sanitizeRemarks(req.body.remarks)
    });

    return sendSuccess(res, 201, {
      message: "Additional income added successfully.",
      income
    });
  } catch (error) {
    return sendError(res, 500, "Failed to add additional income", error);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existingIncome = await Income.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!existingIncome) {
      return sendError(res, 404, "Income entry not found.");
    }

    const amount = Number(req.body.amount);
    const date = req.body.date;

    if (!Number.isFinite(amount) || amount <= 0) {
      return sendError(res, 400, "Income amount must be greater than 0.");
    }
    if (!isValidDate(date)) {
      return sendError(res, 400, "Please select a valid income date.");
    }

    const nextMonth = req.body.month || getMonthFromDate(date);
    if (!isValidMonth(nextMonth)) {
      return sendError(res, 400, "Please select a valid income month.");
    }
    if (!isDateInMonth(date, nextMonth)) {
      return sendError(
        res,
        400,
        `Income date must be within ${nextMonth}. Select that month before saving income.`
      );
    }

    const income = await Income.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        month: nextMonth,
        amount,
        date: new Date(date),
        remarks: sanitizeRemarks(req.body.remarks)
      },
      { new: true }
    );

    return sendSuccess(res, 200, {
      message: "Additional income updated successfully.",
      income
    });
  } catch (error) {
    return sendError(res, 500, "Failed to update additional income", error);
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const deletedIncome = await Income.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!deletedIncome) {
      return sendError(res, 404, "Income entry not found.");
    }

    return sendSuccess(res, 200, {
      message: "Additional income deleted successfully.",
      income: deletedIncome
    });
  } catch (error) {
    return sendError(res, 500, "Failed to delete additional income", error);
  }
});

module.exports = router;
