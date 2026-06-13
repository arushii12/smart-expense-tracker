/*
 * MongoDB initialization for the entire application.
 * index.js waits for databaseReady before accepting requests, while the migration
 * below safely normalizes legacy ownership values for the Mongoose models.
 */
const mongoose = require("mongoose");
const Budget = require("./models/Budget");

const MONGO_URI = process.env.MONGO_URI;
const USER_OWNED_COLLECTIONS = [
  "expenses",
  "budgets",
  "incomes",
  "ignoredsubcategorysuggestions"
];

// Converts only valid 24-character string user IDs to ObjectId.
// The operation is idempotent, so later startups leave already-correct data unchanged.
async function migrateStringUserIds() {
  for (const collectionName of USER_OWNED_COLLECTIONS) {
    const collection = mongoose.connection.collection(collectionName);
    // Update documents in the current user-owned collection directly in MongoDB.
    const result = await collection.updateMany(
      {
        userId: {
          $type: "string",
          $regex: /^[a-fA-F0-9]{24}$/
        }
      },
      [
        {
          $set: {
            userId: { $toObjectId: "$userId" }
          }
        }
      ]
    );

    if (result.modifiedCount > 0) {
      console.log(
        `Migrated ${result.modifiedCount} ${collectionName}.userId value(s) to ObjectId.`
      );
    }

    // Remaining strings cannot reference a normal MongoDB User document, so warn
    // without deleting or rewriting potentially important production data.
    const incompatibleCount = await collection.countDocuments({
      userId: { $type: "string" }
    });
    if (incompatibleCount > 0) {
      console.warn(
        `${collectionName} contains ${incompatibleCount} incompatible string userId value(s).`
      );
    }
  }
}

// Opens the Atlas connection, runs compatibility cleanup, and ensures the budget
// uniqueness index exists before the server begins handling application traffic.
async function connectWithMongo() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI environment variable is required.");
  }

  await mongoose.connect(MONGO_URI);
  console.log("MongoDB connected successfully");
  await migrateStringUserIds();
  await Budget.ensureMongoIndexes();
}

// Exported promise is shared by index.js and tests so initialization has one source.
const databaseReady = connectWithMongo();

module.exports = {
  databaseReady,
  connectWithMongo,
  migrateStringUserIds
};
