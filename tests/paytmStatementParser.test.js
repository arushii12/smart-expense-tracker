const assert = require("node:assert/strict");
const test = require("node:test");

const {
  groupTransactions,
  mapPaytmTag,
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
