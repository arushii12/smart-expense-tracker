const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const auth = require("../middleware/auth");
const { scanReceiptImage } = require("../services/ocrService");
const { parseReceiptText } = require("../services/receiptParser");

const router = express.Router();
const uploadDir = getUploadDir();

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );
}

function getUploadDir() {
  if (isServerlessRuntime()) {
    return path.join("/tmp", "uploads", "receipts");
  }

  return path.join(__dirname, "..", "uploads", "receipts");
}

function ensureUploadDir() {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    return null;
  } catch (error) {
    console.error("Receipt upload directory unavailable:", error.message);
    return error;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const directoryError = ensureUploadDir();
    if (directoryError) {
      cb(new Error("Receipt uploads are temporarily unavailable."));
      return;
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Please upload a valid receipt image."));
    }
    cb(null, true);
  }
});

router.use(auth);

router.post("/scan", (req, res) => {
  upload.single("receipt")(req, res, async error => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Receipt upload failed"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Receipt image is required"
      });
    }

    try {
      const ocrResult = await scanReceiptImage(req.file.path);
      const parsed = parseReceiptText(ocrResult.text, ocrResult.confidence);

      res.json({
        ...parsed,
        receiptImageUrl: `/uploads/receipts/${req.file.filename}`,
        fileName: req.file.filename
      });
    } catch (scanError) {
      res.status(500).json({
        message: "Unable to scan receipt. Please try again or enter details manually.",
        rawText: "",
        amount: null,
        date: "",
        merchant: "",
        categorySuggestion: "Miscellaneous",
        confidence: 0,
        warnings: [
          "OCR processing failed. You can still enter the expense manually."
        ],
        receiptImageUrl: `/uploads/receipts/${req.file.filename}`,
        error: scanError.message
      });
    }
  });
});

module.exports = router;
