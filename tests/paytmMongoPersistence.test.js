/*
 * Opt-in MongoDB integration test for Paytm imports.
 * When RUN_MONGO_INTEGRATION_TESTS=true, it writes isolated records, reconnects,
 * verifies persistence/context/duplicates, and removes all test data in finally.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const PDFDocument = require("pdfkit");

const shouldRun = process.env.RUN_MONGO_INTEGRATION_TESTS === "true";

test("Paytm imports persist in MongoDB and remain duplicates after reconnect", {
  skip: !shouldRun
}, async () => {
  const mongoose = require("mongoose");
  const Expense = require("../models/Expense");
  const Income = require("../models/Income");
  const { __testables } = require("../routes/paytmStatements");
  const userId = new mongoose.Types.ObjectId();
  const suffix = userId.toString().slice(-10).toUpperCase();
  const file = {
    originalname: "Paytm_Payments_History_01_May_26_31_May_26.pdf",
    buffer: await createPaytmPdfBuffer(suffix)
  };

  assert.ok(process.env.MONGO_URI, "MONGO_URI is required for MongoDB integration tests");

  try {
    await mongoose.connect(process.env.MONGO_URI);
    const firstPreview = await __testables.buildPreview(userId, file);
    assert.equal(firstPreview.summary.importableTransactions, 1);
    assert.equal(firstPreview.summary.importableIncomeTransactions, 1);

    const saved = await __testables.savePreview(userId, firstPreview);
    assert.equal(saved.savedExpenses[0].userId.equals(userId), true);
    assert.equal(saved.savedIncomes[0].userId.equals(userId), true);

    await mongoose.disconnect();
    await mongoose.connect(process.env.MONGO_URI);

    const persistedExpenses = await Expense.find({
      userId,
      sourceStatementHash: firstPreview.statementHash
    });
    const persistedIncomes = await Income.find({
      userId,
      sourceStatementHash: firstPreview.statementHash
    });
    assert.equal(persistedExpenses.length, 1);
    assert.equal(persistedIncomes.length, 1);
    assert.deepEqual(await __testables.getLatestImportContext(userId), {
      from: "2026-05-07",
      to: "2026-05-08",
      month: "2026-05"
    });

    const refreshedPreview = await __testables.buildPreview(userId, file);
    assert.equal(refreshedPreview.summary.importableTransactions, 0);
    assert.equal(refreshedPreview.summary.importableIncomeTransactions, 0);
    assert.equal(refreshedPreview.summary.duplicateTransactions, 1);
    assert.equal(refreshedPreview.summary.duplicateIncomeTransactions, 1);
  } finally {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    await mongoose.connection.collection("expenses").deleteMany({ userId });
    await mongoose.connection.collection("incomes").deleteMany({ userId });
    await mongoose.disconnect();
  }
});

// Generates a small valid Paytm-like PDF so the integration test exercises the
// same parser and route helpers used by real uploads.
function createPaytmPdfBuffer(suffix) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 40 });

    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    [
      "Paytm App",
      "Passbook Payments History",
      "07 May",
      "10:30 AM",
      "Paid to Persistence Store",
      "- Rs. 120.00",
      `UPI Ref No: EXP${suffix}`,
      "Tag:",
      "#Food",
      "08 May",
      "09:15 AM",
      "Received from Persistence Client",
      "+ Rs. 500.00",
      `UPI Ref No: INC${suffix}`,
      "Tag:",
      "#Money Transfer"
    ].forEach(line => doc.text(line));

    doc.end();
  });
}
