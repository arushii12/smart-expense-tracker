/*
 * Protected Paytm statement preview/import API.
 * It parses uploaded PDFs through paytmStatementParser, checks MongoDB transaction
 * hashes for duplicates, and permanently saves confirmed expenses and income.
 */
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
// Multer keeps the PDF in memory because parsing and hashing operate on its Buffer.
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

// GET /api/paytm-statements/context
// Called during frontend startup when no local import view state exists. It returns
// the latest saved statement's date/month range from MongoDB so refresh stays useful.
router.get("/context", async (req, res) => {
  try {
    const context = await getLatestImportContext(req.user.id);
    res.json({ context });
  } catch (error) {
    res.status(500).json({
      message: "Unable to load the latest Paytm import context."
    });
  }
});

// POST /api/paytm-statements/preview
// Selecting a PDF sends multipart field "statement". The route parses and
// deduplicates it but performs no writes; grouped rows are returned for review.
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

// POST /api/paytm-statements/import
// Confirm Import re-parses the PDF, repeats server-side duplicate checks, saves
// JWT-owned Expense/Income documents, and returns saved records/counts.
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

    const { savedExpenses, savedIncomes } = await savePreview(req.user.id, preview);

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

// Persists a confirmed preview. Inputs are the verified owner ObjectId and parsed
// preview; output contains the created Mongoose documents.
async function savePreview(userId, preview) {
  const savedExpenses = [];
  for (const group of preview.groups) {
    // Each outgoing group becomes a permanent expenses collection document.
    const expense = await Expense.create({
      userId,
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
    // Each positive received transaction becomes a separate Income document.
    const income = await Income.create({
      userId,
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

  return { savedExpenses, savedIncomes };
}

// Parses one uploaded file and removes transactions already stored for this user.
// It returns review data and summary counts without changing MongoDB.
async function buildPreview(userId, file) {
  validatePdfFile(file);
  const parsed = await parsePaytmStatement(file.buffer, file.originalname);
  // Existing database hashes plus hashes seen earlier in this same file ensure
  // transaction-level deduplication across uploads and within one statement.
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

// Reads every stored Paytm transaction hash from this user's Expense documents.
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

// Reads stored positive-transaction hashes from this user's Income documents.
async function getExistingIncomeTransactionHashes(userId) {
  const incomes = await Income.find({ userId });
  return new Set(
    incomes
      .map(income => income.sourceTransactionHash)
      .filter(Boolean)
  );
}

// Finds the newest imported statement and returns its complete saved date range.
// The browser uses this metadata only for filters; financial records remain authoritative.
async function getLatestImportContext(userId) {
  // Fetch only Paytm-sourced documents owned by this user, newest first.
  const [expenses, incomes] = await Promise.all([
    Expense.find({
      userId,
      source: "Paytm UPI Statement",
      sourceStatementHash: { $ne: "" }
    }).sort({ _id: -1 }),
    Income.find({
      userId,
      source: "Paytm UPI Statement",
      sourceStatementHash: { $ne: "" }
    }).sort({ _id: -1 })
  ]);
  const latestRecord = [expenses[0], incomes[0]]
    .filter(Boolean)
    .sort((left, right) => String(right._id).localeCompare(String(left._id)))[0];

  if (!latestRecord?.sourceStatementHash) return null;

  const dates = [
    ...expenses
      .filter(expense => expense.sourceStatementHash === latestRecord.sourceStatementHash)
      .map(expense => new Date(expense.date).toISOString().split("T")[0]),
    ...incomes
      .filter(income => income.sourceStatementHash === latestRecord.sourceStatementHash)
      .map(income => new Date(income.date).toISOString().split("T")[0])
  ].sort();

  if (!dates.length) return null;

  return {
    from: dates[0],
    to: dates[dates.length - 1],
    month: dates[dates.length - 1].slice(0, 7)
  };
}

// Indicates whether a preview contains at least one new database record.
function hasImportableRecords(summary) {
  return Boolean(
    summary.importableTransactions ||
    summary.importableIncomeTransactions
  );
}

// Indicates whether valid transactions were excluded because MongoDB already has them.
function hasDuplicateRecords(summary) {
  return Boolean(
    summary.duplicateTransactions ||
    summary.duplicateIncomeTransactions
  );
}

// Builds the concise success message displayed after confirmed import.
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

// Wraps Multer so upload size/type errors become predictable 400 JSON responses.
function handlePdfUpload(req, res, next) {
  upload.single("statement")(req, res, error => {
    if (!error) return next();

    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Paytm statement PDF must be 10MB or smaller."
      : error.message || "Unable to upload the Paytm statement.";
    return res.status(400).json({ message });
  });
}

// Verifies that a file exists and begins with the PDF signature before parsing.
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

// Converts parser/upload exceptions into safe client messages while logging details.
function handleParseError(res, error) {
  console.error("Paytm statement import error:", error);
  const status = error.statusCode || 500;
  const message = status < 500
    ? error.message
    : "Unable to parse this Paytm statement. Please upload an original Paytm UPI statement PDF.";
  res.status(status).json({ message });
}

module.exports = router;
module.exports.__testables = {
  buildPreview,
  getLatestImportContext,
  savePreview
};
