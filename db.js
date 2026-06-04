const mongoose = require("mongoose");
const fallbackDb = require("./fallbackDb");

const MONGO_URI = process.env.MONGO_URI;

async function connectWithMongo(uri) {
  await mongoose.connect(uri);
  console.log("MongoDB connected successfully");
}

function useFallbackDatabase() {
  global.__DB_FALLBACK__ = true;
  fallbackDb.init();
  console.warn("Using JSON fallback database for local development.");
}

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      if (process.env.NODE_ENV === "production") {
        process.exit(1);
      }
      useFallbackDatabase();
    });
} else {
  if (process.env.NODE_ENV === "production") {
    throw new Error("MONGO_URI environment variable is required in production.");
  }
  useFallbackDatabase();
}
