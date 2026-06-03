const FINAL_TOTAL_PATTERNS = [
  /\bgrand\s+total\b/i,
  /\bnet\s+total\b/i,
  /\bnet\s+amount\b/i,
  /\bamount\s+payable\b/i,
  /\bfinal\s+amount\b/i,
  /\bfinal\s+total\b/i,
  /\bbill\s+total\b/i,
  /\btotal\s+amount\b/i,
  /\bamount\s+due\b/i,
  /\bpayable\b/i,
  /\btotal\b/i
];

const STRONG_FINAL_TOTAL = /\b(grand\s+total|net\s+total|net\s+amount|amount\s+payable|final\s+amount|final\s+total|bill\s+total|total\s+amount|amount\s+due|payable)\b/i;
const IGNORE_TOTAL_LINE = /\b(taxable\s+value|cgst|sgst|igst|gst|vat|discount|round\s*off|service\s+charge|tip|qty|quantity|price|rate|item\s+total|total\s+qty|total\s+items?)\b/i;
const SUBTOTAL_LINE = /\b(sub\s*total|subtotal)\b/i;
const ID_LINE = /\b(invoice|inv|receipt|bill\s*no|order|token|table|customer|phone|mobile|contact|gstin|gst\s*no|tin|serial|sr\.?|id|email|cashier|covers?|persons?|guests?)\b/i;
const DATE_LABEL = /\b(date|dated|dt\.?|invoice\s+date|bill\s+date|bill\s+dt)\b/i;

const CATEGORY_RULES = [
  {
    category: "Food & Groceries",
    logCategory: "Food",
    pattern: /\b(restaurants?|cafe|food|hotels?|grill|bakery|dining|noodles|biryani|biriyani|masala|coffee|grocery|groceries|shop|kitchen|dhaba|bar)\b/i
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
  const warnings = buildWarnings({ text, amountResult, date });

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
    .replace(/ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¹/g, "Rs ")
    .replace(/ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹/g, "Rs ")
    .replace(/Ã¢â€šÂ¹/g, "Rs ")
    .replace(/\u20B9/g, "Rs ")
    .replace(/\$/g, "Rs ")
    .replace(/\bR(?=\d)/gi, "Rs ")
    .replace(/\bINR\b/gi, "Rs")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFinalAmount(lines) {
  const finalCandidates = [];
  const subtotalCandidates = [];

  lines.forEach((line, index) => {
    if (hasFinalTotalKeyword(line) && !isIgnoredTotalLine(line)) {
      collectAmounts(line, index, true, finalCandidates);

      if (!extractAmountsFromLine(line).length) {
        const nextLine = lines[index + 1] || "";
        collectAmounts(nextLine, index, true, finalCandidates, `${line} / ${nextLine}`);
      }
    }

    if (isSubtotalLine(line)) {
      collectAmounts(line, index, false, subtotalCandidates);

      if (!extractAmountsFromLine(line).length) {
        const nextLine = lines[index + 1] || "";
        collectAmounts(nextLine, index, false, subtotalCandidates, `${line} / ${nextLine}`);
      }
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

  if (subtotalCandidates.length) {
    const bestSubtotal = subtotalCandidates.sort((a, b) => b.amount - a.amount || b.index - a.index)[0];
    return {
      amount: bestSubtotal.amount,
      foundFinalTotal: false,
      source: bestSubtotal.source
    };
  }

  const fallbackCandidates = lines
    .filter(line => !isLineItem(line))
    .filter(line => !ID_LINE.test(line))
    .filter(line => !IGNORE_TOTAL_LINE.test(line))
    .flatMap((line, index) => {
      return extractAmountsFromLine(line)
        .filter(amount => isValidFallbackAmount(line, amount))
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

function collectAmounts(line, index, finalTotal, target, sourceOverride = null) {
  extractAmountsFromLine(line)
    .filter(amount => finalTotal ? isValidFinalAmount(line, amount) : isValidSubtotalAmount(line, amount))
    .forEach(amount => {
      target.push({
        amount,
        source: sourceOverride || line,
        index
      });
    });
}

function hasFinalTotalKeyword(line) {
  return FINAL_TOTAL_PATTERNS.some(pattern => pattern.test(line));
}

function isIgnoredTotalLine(line) {
  const lower = String(line || "").toLowerCase();
  if (isTotalQtyPayableLine(lower)) return false;
  if (STRONG_FINAL_TOTAL.test(lower)) return false;
  if (/^\s*total\s*[:\-]?\s*(rs\s*)?\d/i.test(lower)) return false;
  return IGNORE_TOTAL_LINE.test(lower) || SUBTOTAL_LINE.test(lower);
}

function isTotalQtyPayableLine(line) {
  return /\btotal\s+qty\b.*\btotal\b/i.test(line);
}

function isSubtotalLine(line) {
  return SUBTOTAL_LINE.test(line) && !/\b(cgst|sgst|igst|gst|tax|discount|round\s*off|service\s+charge|tip)\b/i.test(line);
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
  if (!hasFinalTotalKeyword(text)) return text.replace(/\s+/g, " ");

  return text
    .replace(/(^|[^a-z0-9])([2-9])(\d,\d{3}(?:\.\d{1,2})?)(?=$|[^0-9])/gi, (match, prefix, artifact, amount, offset, fullText) => {
      const before = fullText.slice(Math.max(0, offset - 4), offset);
      if (/rs\s*$/i.test(before)) return match;
      return `${prefix}Rs ${amount}`;
    })
    .replace(/(^|[^a-z0-9])([2-9])(\d{4,5}(?:\.\d{1,2})?)(?=$|[^0-9])/gi, (match, prefix, artifact, amount, offset, fullText) => {
      const before = fullText.slice(Math.max(0, offset - 4), offset);
      if (/rs\s*$/i.test(before)) return match;
      return `${prefix}Rs ${amount}`;
    })
    .replace(/\s+/g, " ");
}

function isValidFinalAmount(line, amount) {
  if (!amount || amount < 20) return false;
  if (!isTotalQtyPayableLine(line) && isLineItem(line)) return false;
  if (ID_LINE.test(line) && !hasFinalTotalKeyword(line)) return false;
  if (isIdentifierLikeAmount(line, amount) && !hasFinalTotalKeyword(line)) return false;
  return true;
}

function isValidSubtotalAmount(line, amount) {
  if (!amount || amount < 20) return false;
  if (isIdentifierLikeAmount(line, amount)) return false;
  return true;
}

function isValidFallbackAmount(line, amount) {
  if (!amount || amount < 20) return false;
  if (isIdentifierLikeAmount(line, amount)) return false;
  return true;
}

function isLineItem(line) {
  const text = String(line || "").trim();
  const amounts = extractAmountsFromLine(text);

  if (/^\d+\s*x\b/i.test(text)) return true;
  if (/\b(qty|quantity|price|rate|dish|item)\b/i.test(text)) return true;
  if (/\b\d+\s+(?:x\s+)?[a-z][a-z\s().-]+?\s+\d+(?:\.\d{1,2})?\s+\d+(?:\.\d{1,2})?\b/i.test(text)) return true;
  if (/[a-z]/i.test(text) && amounts.length >= 2 && !hasFinalTotalKeyword(text) && !isSubtotalLine(text)) return true;
  if (/[a-z]/i.test(text) && /^\d+\.?\s+[a-z]/i.test(text)) return true;
  return false;
}

function isIdentifierLikeAmount(line, amount) {
  const text = String(line || "");
  const compact = text.replace(/\D/g, "");
  const amountDigits = String(Math.round(amount));

  if (amountDigits.length >= 6 && !hasFinalTotalKeyword(text)) return true;
  if (compact.length >= 8 && compact.includes(amountDigits) && !hasFinalTotalKeyword(text)) return true;
  if (/\b(contact|phone|mobile|tel|email|table|bill no|invoice|receipt|customer|gstin|tin)\b/i.test(text)) return true;
  return false;
}

function extractReceiptDate(lines) {
  for (let index = 0; index < lines.length; index += 1) {
    if (!DATE_LABEL.test(lines[index])) continue;
    const sameLineDate = parseDateFromText(lines[index]);
    if (sameLineDate) return sameLineDate;
    const nextLineDate = parseDateFromText(lines[index + 1] || "");
    if (nextLineDate) return nextLineDate;
  }

  for (const line of lines.slice(0, 18)) {
    const date = parseDateFromText(line);
    if (date) return date;
    if (ID_LINE.test(line) && !DATE_LABEL.test(line)) continue;
  }

  return "";
}

function parseDateFromText(text) {
  const cleaned = String(text || "")
    .replace(/[oO](?=\d)/g, "0")
    .replace(/(?<=\d)[oO]/g, "0")
    .replace(/[.]/g, "/")
    .replace(/\s*[-/]\s*/g, "/")
    .replace(/\s*:\s*/g, ": ");

  const yearFirstMatches = Array.from(cleaned.matchAll(/\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/g));
  for (const match of yearFirstMatches) {
    const date = buildDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (date) return date;
  }

  const dayFirstMatches = Array.from(cleaned.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g));
  for (const match of dayFirstMatches) {
    const date = buildDateFromTwoPartDate(Number(match[1]), Number(match[2]), normalizeYear(Number(match[3])));
    if (date) return date;
  }

  const monthNameMatches = Array.from(cleaned.matchAll(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{2,4})\b/gi));
  for (const match of monthNameMatches) {
    const date = buildDate(normalizeYear(Number(match[3])), monthNameToNumber(match[2]), Number(match[1]));
    if (date) return date;
  }

  return "";
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year;
}

function buildDateFromTwoPartDate(first, second, year) {
  if (first > 12) return buildDate(year, second, first);
  if (second > 12) return buildDate(year, first, second);
  return buildDate(year, second, first);
}

function buildDate(year, month, day) {
  return toDateInputValue(year, month, day);
}

function monthNameToNumber(monthName) {
  const key = String(monthName || "").slice(0, 3).toLowerCase();
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(key) + 1;
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
  const ignored = /receipt|invoice|tax|gst|cash memo|duplicate|customer|phone|tel|date|time|total|amount|payable|net|bill|table|address|avenue|road|street|near|mode|qty|quantity|contact|e-?mail|cashier|covers?|persons?|guests?|service\s+ch(?:ar)?g|service\s+charge/i;
  const candidate = lines
    .slice(0, 5)
    .find(line => /[a-z]/i.test(line) && !ignored.test(line) && !/(gmail|yahoo|hotmail|\.com|@)/i.test(line) && !/\d/.test(line) && !isLineItem(line) && line.length >= 3);

  return candidate ? titleCase(candidate.replace(/[^a-z0-9 &.'-]/gi, "").trim()) : "";
}

function buildWarnings({ text, amountResult, date }) {
  const warnings = [];

  if (!text || text.trim().length < 20) warnings.push("OCR text is very poor. Please verify manually.");
  if (!amountResult.amount) warnings.push("No final total was detected. Please enter the amount manually.");
  if (amountResult.amount && !amountResult.foundFinalTotal) warnings.push("No final total label was detected. Please verify the selected amount.");
  if (!date) warnings.push("No receipt date was detected. Please enter the date manually.");

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
