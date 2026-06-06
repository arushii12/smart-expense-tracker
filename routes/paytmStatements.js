const express = require("express");
const multer = require("multer");

const auth = require("../middleware/auth");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
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
    if (!hasImportableRecords(preview.summary)) {
      return res.status(422).json({
        message: hasDuplicateRecords(preview.summary)
          ? "All valid Paytm expenses and income entries in this statement were already imported."
          : "No valid Paytm expenses or additional income entries were found in this statement.",
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
    if (!hasImportableRecords(preview.summary)) {
      return res.status(422).json({
        message: hasDuplicateRecords(preview.summary)
          ? "This Paytm statement has already been imported."
          : "No valid Paytm expenses or additional income entries were found to import.",
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

    const savedIncomes = [];
    for (const incomeTransaction of preview.incomeTransactions) {
      const income = await Income.create({
        userId: req.user.id,
        month: incomeTransaction.month,
        amount: incomeTransaction.amount,
        date: new Date(`${incomeTransaction.date}T00:00:00.000Z`),
        remarks: incomeTransaction.remarks,
        source: "Paytm UPI Statement",
        sourceStatementHash: preview.statementHash,
        sourceTransactionHash: incomeTransaction.transactionHash,
        sourcePaytmTag: incomeTransaction.paytmTag,
        sourceTransactionDetails: incomeTransaction.details,
        sourceReferenceNumber: incomeTransaction.referenceNumber
      });
      savedIncomes.push(income);
    }

    res.status(201).json({
      message: buildImportMessage(savedExpenses.length, savedIncomes.length),
      importedExpenses: savedExpenses.length,
      importedTransactions: preview.summary.importableTransactions,
      duplicateTransactions: preview.summary.duplicateTransactions,
      importedIncomeEntries: savedIncomes.length,
      duplicateIncomeTransactions: preview.summary.duplicateIncomeTransactions,
      skippedTransactions: preview.summary.skippedTransactions,
      totalAmountImported: preview.summary.totalAmountToImport,
      totalIncomeAmountImported: preview.summary.totalIncomeAmountToImport,
      expenses: savedExpenses,
      incomes: savedIncomes
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
  const existingIncomeHashes = await getExistingIncomeTransactionHashes(userId);
  const seenIncomeHashes = new Set(existingIncomeHashes);
  const importableIncomeTransactions = parsed.incomeTransactions.filter(transaction => {
    if (seenIncomeHashes.has(transaction.transactionHash)) return false;
    seenIncomeHashes.add(transaction.transactionHash);
    return true;
  });
  const duplicateIncomeTransactions =
    parsed.incomeTransactions.length - importableIncomeTransactions.length;
  const totalIncomeAmountToImport = importableIncomeTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0
  );

  return {
    fileName: file.originalname,
    statementHash: parsed.statementHash,
    groups,
    incomeTransactions: importableIncomeTransactions,
    summary: {
      totalTransactionsFound: parsed.totalTransactionsFound,
      validOutgoingTransactions: parsed.validTransactions.length,
      importableTransactions: importableTransactions.length,
      groupedExpenses: groups.length,
      validIncomeTransactions: parsed.incomeTransactions.length,
      importableIncomeTransactions: importableIncomeTransactions.length,
      skippedTransactions: parsed.skipped.length,
      duplicateTransactions,
      duplicateIncomeTransactions,
      totalAmountToImport: Math.round(totalAmountToImport * 100) / 100,
      totalIncomeAmountToImport: Math.round(totalIncomeAmountToImport * 100) / 100
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

async function getExistingIncomeTransactionHashes(userId) {
  const incomes = await Income.find({ userId });
  return new Set(
    incomes
      .map(income => income.sourceTransactionHash)
      .filter(Boolean)
  );
}

function hasImportableRecords(summary) {
  return Boolean(
    summary.importableTransactions ||
    summary.importableIncomeTransactions
  );
}

function hasDuplicateRecords(summary) {
  return Boolean(
    summary.duplicateTransactions ||
    summary.duplicateIncomeTransactions
  );
}

function buildImportMessage(expenseCount, incomeCount) {
  const parts = [];
  if (expenseCount) {
    parts.push(`${expenseCount} grouped expense${expenseCount === 1 ? "" : "s"}`);
  }
  if (incomeCount) {
    parts.push(`${incomeCount} additional income entr${incomeCount === 1 ? "y" : "ies"}`);
  }
  return `${parts.join(" and ")} imported successfully.`;
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
