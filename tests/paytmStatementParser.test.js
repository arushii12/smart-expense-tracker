const assert = require("node:assert/strict");
const test = require("node:test");

const {
  groupTransactions,
  mapPaytmTag,
  parseIncomeTransactionBlock,
  parseTransactionBlock
} = require("../services/paytmStatementParser");

const context = {
  statementYear: 2026,
  statementEndMonth: 6
};

test("maps supported Paytm tags to app categories", () => {
  assert.deepEqual(mapPaytmTag("Groceries"), {
    category: "Food & Groceries",
    subcategory: "UPI Transaction"
  });
  assert.deepEqual(mapPaytmTag("Travel"), {
    category: "Transport",
    subcategory: "UPI Transaction"
  });
  assert.deepEqual(mapPaytmTag("Unknown Merchant Type"), {
    category: "Miscellaneous",
    subcategory: "Unknown Merchant Type"
  });
});

test("uses the missing-tag fallback for valid outgoing payments", () => {
  const result = parseTransactionBlock(
    [
      "05 Jun",
      "1:00 PM",
      "Paid to Example Store",
      "UPI Ref No: 123456789012",
      "ICICI Bank - 62",
      "- Rs.500"
    ].join("\n"),
    context
  );

  assert.equal(result.transaction.category, "Miscellaneous");
  assert.equal(result.transaction.subcategory, "Unknown UPI Tag");
  assert.equal(result.transaction.isEssential, false);
});

test("skips self transfers, incoming payments, and masked dates", () => {
  const selfTransfer = parseTransactionBlock(
    [
      "05 Jun",
      "1:00 PM",
      "Transferred to Self",
      "Tag:",
      "# Self Transfer",
      "Rs.500"
    ].join("\n"),
    context
  );
  const refund = parseTransactionBlock(
    [
      "05 Jun",
      "1:00 PM",
      "Refund from Example",
      "Tag:",
      "# Refund",
      "+ Rs.500"
    ].join("\n"),
    context
  );
  const masked = parseTransactionBlock(
    [
      "XX XXX",
      "1:00 PM",
      "Paid to Example",
      "Tag:",
      "# Food",
      "- Rs.500"
    ].join("\n"),
    context
  );

  assert.equal(selfTransfer.reason, "Self Transfer ignored");
  assert.equal(refund.reason, "Incoming payment or refund ignored");
  assert.equal(masked.reason, "Missing or unreadable date");
});

test("parses positive Paytm transactions as additional income", () => {
  const result = parseIncomeTransactionBlock(
    [
      "10 May",
      "12:26 PM",
      "Refund from Indian Railways",
      "UPI Ref No: 613001265327",
      "Tag:",
      "# Refund",
      "ICICI Bank - 62",
      "+ Rs.4,560"
    ].join("\n"),
    context
  );

  assert.equal(result.incomeTransaction.date, "2026-05-10");
  assert.equal(result.incomeTransaction.month, "2026-05");
  assert.equal(result.incomeTransaction.amount, 4560);
  assert.equal(result.incomeTransaction.paytmTag, "Refund");
  assert.equal(result.incomeTransaction.remarks, "Paytm UPI - Refund");
  assert.equal(result.incomeTransaction.referenceNumber, "613001265327");
});

test("uses Money Received remarks for positive transactions without a tag", () => {
  const result = parseIncomeTransactionBlock(
    [
      "05 Jun",
      "1:00 PM",
      "Money received from Example",
      "UPI Ref No: 123456789012",
      "ICICI Bank - 62",
      "+ Rs.500"
    ].join("\n"),
    context
  );

  assert.equal(result.incomeTransaction.remarks, "Paytm UPI - Money Received");
});

test("does not treat self transfers as additional income", () => {
  const result = parseIncomeTransactionBlock(
    [
      "05 Jun",
      "1:00 PM",
      "Transferred to Self",
      "Tag:",
      "# Self Transfer",
      "+ Rs.500"
    ].join("\n"),
    context
  );

  assert.equal(result.reason, "Self Transfer ignored");
});

test("uses separate hashes for income and expense records with the same reference", () => {
  const expense = parseTransactionBlock(
    [
      "05 Jun",
      "1:00 PM",
      "Paid to Example",
      "UPI Ref No: 123456789012",
      "Tag:",
      "# Food",
      "- Rs.500"
    ].join("\n"),
    context
  );
  const income = parseIncomeTransactionBlock(
    [
      "05 Jun",
      "2:00 PM",
      "Refund from Example",
      "UPI Ref No: 123456789012",
      "Tag:",
      "# Refund",
      "+ Rs.500"
    ].join("\n"),
    context
  );

  assert.notEqual(
    expense.transaction.transactionHash,
    income.incomeTransaction.transactionHash
  );
});

test("groups transactions by date and final category", () => {
  const transactions = [
    {
      date: "2026-06-01",
      amount: 500,
      paytmTag: "Groceries",
      category: "Food & Groceries",
      subcategory: "UPI Transaction",
      isEssential: true,
      details: "Paid to Store A",
      referenceNumber: "1",
      transactionHash: "hash-1"
    },
    {
      date: "2026-06-01",
      amount: 700,
      paytmTag: "Food",
      category: "Food & Groceries",
      subcategory: "UPI Transaction",
      isEssential: true,
      details: "Paid to Store B",
      referenceNumber: "2",
      transactionHash: "hash-2"
    }
  ];

  const groups = groupTransactions(transactions);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].amount, 1200);
  assert.deepEqual(groups[0].paytmTags, ["Groceries", "Food"]);
  assert.equal(groups[0].category, "Food & Groceries");
  assert.equal(groups[0].isEssential, true);
});
