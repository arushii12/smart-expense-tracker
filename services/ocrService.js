const { recognize } = require("tesseract.js");

async function scanReceiptImage(imagePath) {
  const result = await recognize(imagePath, "eng", {
    logger: () => {},
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
