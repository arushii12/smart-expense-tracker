/*
 * Unit tests for JWT-to-MongoDB ownership behavior.
 * They verify that protected routes receive ObjectIds, legacy JSON UUID sessions
 * are rejected safely, and every user-owned schema casts ownership consistently.
 */
const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

process.env.JWT_SECRET = "mongo-user-id-test-secret";

const auth = require("../middleware/auth");
const Budget = require("../models/Budget");
const Expense = require("../models/Expense");
const IgnoredSubcategorySuggestion = require("../models/IgnoredSubcategorySuggestion");
const Income = require("../models/Income");

// Executes auth middleware with a small mock request/response and reports whether
// middleware called next or returned an error response.
function runAuth(token) {
  return new Promise(resolve => {
    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    const response = {
      statusCode: 200,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        resolve({ req, res: this, nextCalled: false });
      }
    };

    auth(req, response, () => {
      resolve({ req, res: response, nextCalled: true });
    });
  });
}

test("auth converts a valid JWT user id into a MongoDB ObjectId", async () => {
  const id = new mongoose.Types.ObjectId();
  const token = jwt.sign(
    { id: id.toString(), email: "user@example.com" },
    process.env.JWT_SECRET
  );

  const result = await runAuth(token);

  assert.equal(result.nextCalled, true);
  assert.equal(result.req.user.id instanceof mongoose.Types.ObjectId, true);
  assert.equal(result.req.user.id.equals(id), true);
});

test("auth rejects a legacy JSON UUID before it reaches Mongoose queries", async () => {
  const token = jwt.sign(
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      email: "legacy@example.com"
    },
    process.env.JWT_SECRET
  );

  const result = await runAuth(token);

  assert.equal(result.nextCalled, false);
  assert.equal(result.res.statusCode, 401);
  assert.match(result.res.payload.message, /log in again/i);
});

test("all user-owned models cast the same ObjectId ownership value", () => {
  const userId = new mongoose.Types.ObjectId();
  const queries = [
    Budget.find({ userId }),
    Expense.find({ userId }),
    IgnoredSubcategorySuggestion.find({ userId }),
    Income.find({ userId })
  ];

  queries.forEach(query => {
    assert.equal(query.model.schema.path("userId").instance, "ObjectId");
    assert.doesNotThrow(() => query.cast());
    assert.equal(query.getFilter().userId.equals(userId), true);
  });
});
