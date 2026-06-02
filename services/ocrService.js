const { recognize } = require("tesseract.js");

async function scanReceiptImage(imagePath) {
  const result = await recognize(imagePath, "eng", {
    logger: () => {}
  });

  return {
    text: result.data?.text || "",
    confidence: Number(result.data?.confidence) || 0
  };
}

module.exports = {
  scanReceiptImage
};
