const mongoose = require("mongoose");
const fallbackDb = require("../fallbackDb");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
});

let UserModel;
function getUserModel() {
  if (global.__DB_FALLBACK__) {
    return fallbackDb.collection("users");
  }
  if (!UserModel) {
    UserModel = mongoose.models.User || mongoose.model("User", userSchema);
  }
  return UserModel;
}

module.exports = {
  create: async data => getUserModel().create(data),
  findOne: async query => getUserModel().findOne(query),
  findOneAndUpdate: async (filter, update, options) =>
    getUserModel().findOneAndUpdate(filter, update, options),
  findById: id => {
    const model = getUserModel();
    if (global.__DB_FALLBACK__) {
      const result = model.findById(id);
      return {
        select() {
          return this;
        },
        then: result.then.bind(result),
        catch: result.catch.bind(result),
        finally: result.finally.bind(result)
      };
    }
    return model.findById(id);
  }
};
