const mongoose = require("mongoose");

const MONGO_URI =
  "mongodb+srv://aru_db_user:IA29eCNPe4OZ9Bnj@cluster0.osbbojx.mongodb.net/expenseTracker?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
