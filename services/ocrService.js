/*
 * Receipt OCR service.
 * routes/receipts.js supplies an uploaded image path; this service runs Tesseract
 * and returns only normalized text/confidence for receiptParser.js.
 */
const { recognize } = require("tesseract.js");

// Runs English OCR for one image and resolves with raw text plus numeric confidence.
// errorHandler keeps worker failures inside the promise so the route can respond safely.
async function scanReceiptImage(imagePath) {
  const result = await recognize(imagePath, "eng", {
    logger: () => {},
    errorHandler: () => {},
    tessedit_pageseg_mode: "6",
    preserve_interword_spaces: "1"
  });

  return {
    text: result.data?.text || "",
    confidence: Number(result.data?.confidence) || 0
  };
}

module.exports = {
  scanReceiptImage
};
