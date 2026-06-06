const crypto = require("crypto");
const pdfParse = require("pdf-parse");

const TAG_CATEGORY_MAP = new Map([
  ["groceries", "Food & Groceries"],
  ["food", "Food & Groceries"],
  ["bill payments", "Utilities & Bills"],
  ["taxi", "Transport"],
  ["fuel", "Transport"],
  ["travel", "Transport"],
  ["shopping", "Miscellaneous"],
  ["services", "Miscellaneous"],
  ["financial", "Miscellaneous"],
  ["money transfer", "Miscellaneous"]
]);

const ESSENTIAL_CATEGORIES = new Set([
  "Food & Groceries",
  "Utilities & Bills",
  "Transport",
  "Home"
]);

const MONTH_INDEX = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12
};

async function parsePaytmStatement(buffer, fileName = "") {
  const parsedPdf = await pdfParse(buffer);
  const text = normalizeText(parsedPdf.text);
  if (!/Paytm App|Passbook Payments History/i.test(text)) {
    const error = new Error("This PDF does not appear to be a Paytm UPI statement.");
    error.statusCode = 400;
    throw error;
  }

  const statementYear = inferStatementYear(fileName, parsedPdf.info);
  const statementEndMonth = inferStatementEndMonth(fileName);
  const blocks = splitTransactionBlocks(text);
  const validTransactions = [];
  const incomeTransactions = [];
  const skipped = [];

  blocks.forEach((block, index) => {
    const parsed = parseTransactionBlock(block, {
      statementYear,
      statementEndMonth
    });

    if (!parsed.transaction) {
      if (parsed.reason === "Incoming payment or refund ignored") {
        const incomeParsed = parseIncomeTransactionBlock(block, {
          statementYear,
          statementEndMonth
        });

        if (incomeParsed.incomeTransaction) {
          incomeTransactions.push(incomeParsed.incomeTransaction);
          return;
        }
      }

      skipped.push({
        index,
        reason: parsed.reason
      });
      return;
    }

    validTransactions.push(parsed.transaction);
  });

  const statementHash = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  return {
    statementHash,
    statementYear,
    pageCount: parsedPdf.numpages || 0,
    totalTransactionsFound: blocks.length,
    validTransactions,
    incomeTransactions,
    skipped
  };
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ");
}

function splitTransactionBlocks(text) {
  const matches = Array.from(
    text.matchAll(/(?:^|\n)([^\n]+)\n(?=\d{1,2}:\d{2}\s+(?:AM|PM)\s*\n)/gi)
  );
  return matches.map((match, index) => {
    const start = match.index + (match[0].startsWith("\n") ? 1 : 0);
    const end = index + 1 < matches.length
      ? matches[index + 1].index
      : text.length;
    return text.slice(start, end).trim();
  });
}

function parseTransactionBlock(block, context) {
  const dateMatch = block.match(/^(\d{2})\s+([A-Za-z]{3})/);

  if (!dateMatch) {
    return { reason: "Missing or unreadable date" };
  }

  const tag = extractTag(block);
  if (normalizeTag(tag) === "self transfer") {
    return { reason: "Self Transfer ignored" };
  }

  const amountMatch = block.match(/([+-])\s*Rs\.\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) {
    return { reason: "Missing or unreadable amount" };
  }

  if (amountMatch[1] !== "-") {
    return { reason: "Incoming payment or refund ignored" };
  }

  const month = MONTH_INDEX[dateMatch[2].toLowerCase()];
  const day = Number(dateMatch[1]);
  if (!month || day < 1 || day > 31) {
    return { reason: "Missing or unreadable date" };
  }

  const year = resolveTransactionYear(month, context.statementYear, context.statementEndMonth);
  const date = toIsoDate(year, month, day);
  if (!date) {
    return { reason: "Invalid transaction date" };
  }

  const amount = Number(amountMatch[2].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { reason: "Missing or unreadable amount" };
  }

  const details = extractTransactionDetails(block);
  const referenceNumber = block.match(/UPI Ref No:\s*([A-Za-z0-9-]+)/i)?.[1] || "";
  const mapping = mapPaytmTag(tag);
  const transactionHash = buildTransactionHash({
    date,
    amount,
    tag,
    details,
    referenceNumber
  });

  return {
    transaction: {
      date,
      amount,
      paytmTag: tag,
      category: mapping.category,
      subcategory: mapping.subcategory,
      isEssential: ESSENTIAL_CATEGORIES.has(mapping.category),
      details,
      referenceNumber,
      transactionHash
    }
  };
}

function parseIncomeTransactionBlock(block, context) {
  const dateMatch = block.match(/^(\d{2})\s+([A-Za-z]{3})/);
  if (!dateMatch) {
    return { reason: "Missing or unreadable date" };
  }

  const tag = extractTag(block);
  if (normalizeTag(tag) === "self transfer") {
    return { reason: "Self Transfer ignored" };
  }

  const amountMatch = block.match(/\+\s*Rs\.\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (!amountMatch) {
    return { reason: "Not a positive Paytm transaction" };
  }

  const month = MONTH_INDEX[dateMatch[2].toLowerCase()];
  const day = Number(dateMatch[1]);
  if (!month || day < 1 || day > 31) {
    return { reason: "Missing or unreadable date" };
  }

  const year = resolveTransactionYear(month, context.statementYear, context.statementEndMonth);
  const date = toIsoDate(year, month, day);
  if (!date) {
    return { reason: "Invalid transaction date" };
  }

  const amount = Number(amountMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { reason: "Missing or unreadable amount" };
  }

  const details = extractTransactionDetails(block);
  const referenceNumber = block.match(/UPI Ref No:\s*([A-Za-z0-9-]+)/i)?.[1] || "";
  const transactionHash = buildIncomeTransactionHash({
    date,
    amount,
    tag,
    details,
    referenceNumber
  });

  return {
    incomeTransaction: {
      date,
      month: date.slice(0, 7),
      amount,
      paytmTag: tag,
      remarks: `Paytm UPI - ${tag || "Money Received"}`,
      details,
      referenceNumber,
      transactionHash
    }
  };
}

function extractTag(block) {
  const match = block.match(/Tag:\s*\n?\s*#([^\n]*)/i);
  if (!match) return "";

  return match[1]
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTransactionDetails(block) {
  const withoutDateAndTime = block
    .replace(/^\d{2}\s+[A-Za-z]{3}\s*\n/, "")
    .replace(/^\d{1,2}:\d{2}\s+(?:AM|PM)\s*\n/i, "");
  const boundary = withoutDateAndTime.search(/\n\s*(?:UPI ID:|UPI Ref No:|Order ID:|Note:|Tag:)/i);
  const detailText = boundary >= 0
    ? withoutDateAndTime.slice(0, boundary)
    : withoutDateAndTime.split("\n")[0];

  return detailText.replace(/\s+/g, " ").trim();
}

function mapPaytmTag(tag) {
  const normalized = normalizeTag(tag);
  const category = TAG_CATEGORY_MAP.get(normalized);

  if (category) {
    return {
      category,
      subcategory: "UPI Transaction"
    };
  }

  if (!tag) {
    return {
      category: "Miscellaneous",
      subcategory: "Unknown UPI Tag"
    };
  }

  return {
    category: "Miscellaneous",
    subcategory: tag
  };
}

function normalizeTag(tag) {
  return String(tag || "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function groupTransactions(transactions) {
  const groups = new Map();

  transactions.forEach(transaction => {
    const key = `${transaction.date}|${transaction.category}`;
    if (!groups.has(key)) {
      groups.set(key, {
        date: transaction.date,
        category: transaction.category,
        amount: 0,
        paytmTags: [],
        subcategories: [],
        isEssential: transaction.isEssential,
        details: [],
        referenceNumbers: [],
        transactionHashes: []
      });
    }

    const group = groups.get(key);
    group.amount += transaction.amount;
    addUnique(group.paytmTags, transaction.paytmTag || "Unknown UPI Tag");
    addUnique(group.subcategories, transaction.subcategory);
    addUnique(group.details, transaction.details);
    addUnique(group.referenceNumbers, transaction.referenceNumber);
    group.transactionHashes.push(transaction.transactionHash);
  });

  return Array.from(groups.values())
    .map(group => ({
      date: group.date,
      category: group.category,
      subcategory: getGroupedSubcategory(group.subcategories),
      amount: Math.round(group.amount * 100) / 100,
      isEssential: group.isEssential,
      paytmTags: group.paytmTags,
      details: group.details.filter(Boolean),
      referenceNumbers: group.referenceNumbers.filter(Boolean),
      transactionHashes: group.transactionHashes
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.category.localeCompare(b.category));
}

function getGroupedSubcategory(subcategories) {
  const unique = subcategories.filter(Boolean);
  if (unique.length === 1) return unique[0];
  if (unique.every(value => value === "UPI Transaction")) return "UPI Transaction";
  return "Multiple UPI Tags";
}

function addUnique(list, value) {
  if (value && !list.includes(value)) {
    list.push(value);
  }
}

function buildTransactionHash(transaction) {
  const stableValue = transaction.referenceNumber
    ? `paytm-ref|${transaction.referenceNumber}`
    : [
        "paytm",
        transaction.date,
        Number(transaction.amount).toFixed(2),
        normalizeTag(transaction.tag),
        String(transaction.details || "").replace(/\s+/g, " ").trim().toLowerCase()
      ].join("|");

  return crypto.createHash("sha256").update(stableValue).digest("hex");
}

function buildIncomeTransactionHash(transaction) {
  const stableValue = transaction.referenceNumber
    ? `paytm-income-ref|${transaction.referenceNumber}`
    : [
        "paytm-income",
        transaction.date,
        Number(transaction.amount).toFixed(2),
        normalizeTag(transaction.tag),
        String(transaction.details || "").replace(/\s+/g, " ").trim().toLowerCase()
      ].join("|");

  return crypto.createHash("sha256").update(stableValue).digest("hex");
}

function inferStatementYear(fileName, info = {}) {
  const fileYears = Array.from(String(fileName || "").matchAll(/(?:'|\b)(\d{2}|\d{4})(?=\D|$)/g))
    .map(match => normalizeYear(match[1]))
    .filter(Boolean);
  if (fileYears.length) return fileYears[fileYears.length - 1];

  const metadataYear = String(info.CreationDate || info.ModDate || "").match(/D:(\d{4})/)?.[1];
  return metadataYear ? Number(metadataYear) : new Date().getFullYear();
}

function inferStatementEndMonth(fileName) {
  const matches = Array.from(String(fileName || "").matchAll(/(\d{1,2})[\s_-]+([A-Za-z]{3})/g));
  if (!matches.length) return null;
  return MONTH_INDEX[matches[matches.length - 1][2].toLowerCase()] || null;
}

function normalizeYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year)) return null;
  if (String(value).length === 2) return 2000 + year;
  return year >= 2000 && year <= 2200 ? year : null;
}

function resolveTransactionYear(month, statementYear, statementEndMonth) {
  if (statementEndMonth && month > statementEndMonth) {
    return statementYear - 1;
  }
  return statementYear;
}

function toIsoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

module.exports = {
  groupTransactions,
  mapPaytmTag,
  parseIncomeTransactionBlock,
  parsePaytmStatement,
  parseTransactionBlock,
  splitTransactionBlocks
};
