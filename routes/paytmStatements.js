const express = require("express");
const multer = require("multer");

const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const {
  groupTransactions,
  parsePaytmStatement
} = require("../services/paytmStatementParser");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, callback) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      String(file.originalname || "").toLowerCase().endsWith(".pdf");
    callback(isPdf ? null : new Error("Please upload a valid PDF statement."), isPdf);
  }
});

router.use(auth);

router.post("/preview", handlePdfUpload, async (req, res) => {
  try {
    const preview = await buildPreview(req.user.id, req.file);
    if (!preview.summary.importableTransactions) {
      return res.status(422).json({
        message: preview.summary.duplicateTransactions
          ? "All valid outgoing transactions in this statement were already imported."
          : "No valid outgoing Paytm transactions were found in this statement.",
        ...preview
      });
    }

    res.json(preview);
  } catch (error) {
    handleParseError(res, error);
  }
});

router.post("/import", handlePdfUpload, async (req, res) => {
  try {
    const preview = await buildPreview(req.user.id, req.file);
    if (!preview.summary.importableTransactions) {
      return res.status(422).json({
        message: preview.summary.duplicateTransactions
          ? "This Paytm statement has already been imported."
          : "No valid outgoing Paytm transactions were found to import.",
        ...preview
      });
    }

    const savedExpenses = [];
    for (const group of preview.groups) {
      const expense = await Expense.create({
        userId: req.user.id,
        amount: group.amount,
        category: group.category,
        subcategory: group.subcategory,
        isEssential: group.isEssential,
        date: new Date(`${group.date}T00:00:00.000Z`),
        source: "Paytm UPI Statement",
        notes: "Imported from Paytm UPI Statement",
        sourceStatementHash: preview.statementHash,
        sourceTransactionHashes: group.transactionHashes,
        sourcePaytmTags: group.paytmTags,
        sourceTransactionDetails: group.details,
        sourceReferenceNumbers: group.referenceNumbers
      });
      savedExpenses.push(expense);
    }

    res.status(201).json({
      message: `${savedExpenses.length} grouped expense${savedExpenses.length === 1 ? "" : "s"} imported successfully.`,
      importedExpenses: savedExpenses.length,
      importedTransactions: preview.summary.importableTransactions,
      duplicateTransactions: preview.summary.duplicateTransactions,
      skippedTransactions: preview.summary.skippedTransactions,
      totalAmountImported: preview.summary.totalAmountToImport,
      expenses: savedExpenses
    });
  } catch (error) {
    handleParseError(res, error);
  }
});

async function buildPreview(userId, file) {
  validatePdfFile(file);
  const parsed = await parsePaytmStatement(file.buffer, file.originalname);
  const existingHashes = await getExistingTransactionHashes(userId);
  const seenHashes = new Set(existingHashes);
  const importableTransactions = parsed.validTransactions.filter(transaction => {
    if (seenHashes.has(transaction.transactionHash)) return false;
    seenHashes.add(transaction.transactionHash);
    return true;
  });
  const duplicateTransactions =
    parsed.validTransactions.length - importableTransactions.length;
  const groups = groupTransactions(importableTransactions);
  const totalAmountToImport = groups.reduce((sum, group) => sum + group.amount, 0);

  return {
    fileName: file.originalname,
    statementHash: parsed.statementHash,
    groups,
    summary: {
      totalTransactionsFound: parsed.totalTransactionsFound,
      validOutgoingTransactions: parsed.validTransactions.length,
      importableTransactions: importableTransactions.length,
      groupedExpenses: groups.length,
      skippedTransactions: parsed.skipped.length,
      duplicateTransactions,
      totalAmountToImport: Math.round(totalAmountToImport * 100) / 100
    }
  };
}

async function getExistingTransactionHashes(userId) {
  const expenses = await Expense.find({ userId });
  return new Set(
    expenses.flatMap(expense =>
      Array.isArray(expense.sourceTransactionHashes)
        ? expense.sourceTransactionHashes
        : []
    )
  );
}

function handlePdfUpload(req, res, next) {
  upload.single("statement")(req, res, error => {
    if (!error) return next();

    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Paytm statement PDF must be 10MB or smaller."
      : error.message || "Unable to upload the Paytm statement.";
    return res.status(400).json({ message });
  });
}

function validatePdfFile(file) {
  if (!file?.buffer?.length) {
    const error = new Error("Choose a Paytm UPI statement PDF to continue.");
    error.statusCode = 400;
    throw error;
  }

  if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    const error = new Error("The uploaded file is not a valid PDF.");
    error.statusCode = 400;
    throw error;
  }
}

function handleParseError(res, error) {
  console.error("Paytm statement import error:", error);
  const status = error.statusCode || 500;
  const message = status < 500
    ? error.message
    : "Unable to parse this Paytm statement. Please upload an original Paytm UPI statement PDF.";
  res.status(status).json({ message });
}

module.exports = router;
