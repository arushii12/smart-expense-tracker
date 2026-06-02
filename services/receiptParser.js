const FINAL_TOTAL_PATTERNS = [
  /\bgrand\s+total\b/i,
  /\bnet\s+total\b/i,
  /\bnet\s+amount\b/i,
  /\bamount\s+payable\b/i,
  /\bfinal\s+amount\b/i,
  /\bfinal\s+total\b/i,
  /\bbill\s+total\b/i,
  /\btotal\s+amount\b/i,
  /\btotal\b/i
];

const IGNORE_AMOUNT_LINE = /\b(sub\s*total|subtotal|taxable\s+value|cgst|sgst|igst|gst|vat|discount|round\s*off|service\s+charge|tip|qty|quantity|price|rate|item\s+total)\b/i;
const ID_LINE = /\b(invoice|inv|receipt|bill\s*no|order|token|table|customer|phone|mobile|gstin|gst\s*no|tin|serial|sr\.?|id)\b/i;
const DATE_LABEL = /\b(date|invoice\s+date|bill\s+date)\b/i;

const CATEGORY_RULES = [
  {
    category: "Food & Groceries",
    logCategory: "Food",
    pattern: /\b(restaurant|cafe|food|hotel|bakery|dining|noodles|biryani|masala|coffee)\b/i
  },
  {
    category: "Transport",
    logCategory: "Transport",
    pattern: /\b(fuel|petrol|diesel|taxi|cab|uber|ola|metro|train|bus)\b/i
  },
  {
    category: "Utilities & Bills",
    logCategory: "Utilities",
    pattern: /\b(electricity|internet|recharge|mobile|wifi|broadband)\b/i
  }
];

function parseReceiptText(rawText = "", confidence = 0) {
  const text = normalizeText(rawText);
  const lines = text.split("\n").map(normalizeLine).filter(Boolean);
  const amountResult = extractFinalAmount(lines);
  const date = extractReceiptDate(lines);
  const merchant = extractMerchant(lines);
  const categoryResult = classifyReceipt(`${merchant}\n${text}`);
  const warnings = buildWarnings({ text, amountResult, date, confidence });

  console.log("Detected total:", amountResult.amount);
  console.log("Detected date:", date);
  console.log("Detected merchant:", merchant);
  console.log("Receipt classification:", categoryResult.logCategory);

  return {
    rawText,
    amount: amountResult.amount,
    date,
    merchant,
    categorySuggestion: categoryResult.category,
    confidence: Math.round(Number(confidence) || 0),
    amountConfidence: amountResult.foundFinalTotal ? "high" : "low",
    amountSource: amountResult.source,
    warnings
  };
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\r/g, "\n")
    .replace(/[|]+/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function normalizeLine(line) {
  return String(line || "")
    .replace(/Ã¢â€šÂ¹/g, "Rs ")
    .replace(/â‚¹/g, "Rs ")
    .replace(/\u20B9/g, "Rs ")
    .replace(/\bR(?=\d)/gi, "Rs ")
    .replace(/\bINR\b/gi, "Rs")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFinalAmount(lines) {
  const finalCandidates = [];

  lines.forEach((line, index) => {
    if (!hasFinalTotalKeyword(line)) return;
    if (isIgnoredSummaryLine(line)) return;

    const lineAmounts = extractAmountsFromLine(line)
      .filter(amount => isValidSummaryAmount(line, amount));

    lineAmounts.forEach(amount => {
      finalCandidates.push({
        amount,
        source: line,
        index
      });
    });

    if (!lineAmounts.length) {
      const nextLine = lines[index + 1] || "";
      extractAmountsFromLine(nextLine)
        .filter(amount => isValidSummaryAmount(nextLine, amount))
        .forEach(amount => {
          finalCandidates.push({
            amount,
            source: `${line} / ${nextLine}`,
            index
          });
        });
    }
  });

  if (finalCandidates.length) {
    const best = finalCandidates.sort((a, b) => b.amount - a.amount || b.index - a.index)[0];
    return {
      amount: best.amount,
      foundFinalTotal: true,
      source: best.source
    };
  }

  const fallbackCandidates = lines
    .filter(line => !isLineItem(line))
    .filter(line => !ID_LINE.test(line))
    .filter(line => !IGNORE_AMOUNT_LINE.test(line))
    .flatMap((line, index) => {
      return extractAmountsFromLine(line)
        .filter(amount => amount >= 20)
        .map(amount => ({ amount, source: line, index }));
    });

  if (!fallbackCandidates.length) {
    return {
      amount: null,
      foundFinalTotal: false,
      source: ""
    };
  }

  const bestFallback = fallbackCandidates.sort((a, b) => b.amount - a.amount || b.index - a.index)[0];
  return {
    amount: bestFallback.amount,
    foundFinalTotal: false,
    source: bestFallback.source
  };
}

function hasFinalTotalKeyword(line) {
  return FINAL_TOTAL_PATTERNS.some(pattern => pattern.test(line));
}

function isIgnoredSummaryLine(line) {
  const lower = line.toLowerCase();
  if (/\b(grand\s+total|net\s+total|net\s+amount|amount\s+payable|final\s+amount|final\s+total|bill\s+total|total\s+amount)\b/i.test(lower)) {
    return false;
  }
  if (/^\s*total\s*[:\-]?\s*(rs\s*)?\d/i.test(lower)) {
    return false;
  }
  return IGNORE_AMOUNT_LINE.test(lower);
}

function extractAmountsFromLine(line) {
  const normalizedLine = normalizeCurrencyArtifacts(line);
  const matches = Array.from(normalizedLine.matchAll(/(?:rs\.?\s*)?([0-9]{1,3}(?:,[0-9]{3})+(?:\.\d{1,2})?|[0-9]+(?:\.\d{1,2})?)/gi));

  return matches
    .map(match => Number(match[1].replace(/,/g, "")))
    .filter(amount => Number.isFinite(amount) && amount > 0)
    .map(amount => Number(amount.toFixed(2)));
}

function normalizeCurrencyArtifacts(line) {
  const text = String(line || "").replace(/\b(rs\.?|inr)\s*/gi, "Rs ");
  if (!hasFinalTotalKeyword(text)) {
    return text.replace(/\s+/g, " ");
  }

  return text
    .replace(/(^|[^a-z0-9])([2-9])(\d{4,5}(?:\.\d{1,2})?)(?=$|[^0-9])/gi, (match, prefix, artifact, amount) => {
      return `${prefix}Rs ${amount}`;
    })
    .replace(/\s+/g, " ");
}

function isValidSummaryAmount(line, amount) {
  if (!amount || amount < 20) return false;
  if (isLineItem(line)) return false;
  if (ID_LINE.test(line) && !hasFinalTotalKeyword(line)) return false;
  return true;
}

function isLineItem(line) {
  const text = String(line || "").trim();
  const amounts = extractAmountsFromLine(text);

  if (/^\d+\s*x\b/i.test(text)) return true;
  if (/\b(qty|quantity|price|rate)\b/i.test(text)) return true;
  if (/[a-z]/i.test(text) && amounts.length >= 2) return true;
  if (/[a-z]/i.test(text) && /^\d+\s+[a-z]/i.test(text)) return true;

  return false;
}

function extractReceiptDate(lines) {
  const labeledLines = lines.filter(line => DATE_LABEL.test(line));

  for (const line of labeledLines) {
    const date = parseDateFromText(line);
    if (date) return date;
  }

  for (const line of lines.slice(0, 10)) {
    const date = parseDateFromText(line);
    if (date) return date;
  }

  return "";
}

function parseDateFromText(text) {
  const dayFirst = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (dayFirst) {
    return toDateInputValue(normalizeYear(Number(dayFirst[3])), Number(dayFirst[2]), Number(dayFirst[1]));
  }

  const yearFirst = text.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (yearFirst) {
    return toDateInputValue(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));
  }

  return "";
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year;
}

function toDateInputValue(year, month, day) {
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function classifyReceipt(text) {
  const match = CATEGORY_RULES.find(rule => rule.pattern.test(text));
  return match || {
    category: "Miscellaneous",
    logCategory: "Miscellaneous"
  };
}

function extractMerchant(lines) {
  const ignored = /receipt|invoice|tax|gst|cash memo|duplicate|customer|phone|tel|date|time|total|amount|payable|net|bill|table|address|avenue|road|street|near|mode|qty|quantity/i;
  const candidate = lines
    .slice(0, 6)
    .find(line => /[a-z]/i.test(line) && !ignored.test(line) && !isLineItem(line) && line.length >= 3);

  return candidate ? titleCase(candidate.replace(/[^a-z0-9 &.'-]/gi, "").trim()) : "";
}

function buildWarnings({ text, amountResult, date, confidence }) {
  const warnings = [];

  if (!text || text.trim().length < 20) {
    warnings.push("OCR text is very poor. Please verify manually.");
  }
  if (!amountResult.amount) {
    warnings.push("No final total was detected. Please enter the amount manually.");
  }
  if (amountResult.amount && !amountResult.foundFinalTotal) {
    warnings.push("No final total label was detected. Please verify the selected largest amount.");
  }
  if (!date) {
    warnings.push("No receipt date was detected. Please enter the date manually.");
  }

  return warnings;
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

module.exports = {
  parseReceiptText
};
