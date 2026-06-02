const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dataDir = path.join(__dirname, "data");
const collectionCache = new Map();

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function getCollectionFile(name) {
  ensureDataDir();
  return path.join(dataDir, `${name}.json`);
}

function loadCollection(name) {
  const file = getCollectionFile(name);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf8");
  }

  try {
    const raw = fs.readFileSync(file, "utf8") || "[]";
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function saveCollection(name, items) {
  const file = getCollectionFile(name);
  fs.writeFileSync(file, JSON.stringify(items, null, 2), "utf8");
}

function normalizeValue(value) {
  if (value instanceof Date) {
    return value.getTime();
  }
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }
  return value;
}

function compareValues(itemValue, queryValue) {
  const normalizedItem = normalizeValue(itemValue);
  const normalizedQuery = normalizeValue(queryValue);

  if (queryValue && typeof queryValue === "object" && !Array.isArray(queryValue)) {
    return Object.entries(queryValue).every(([operator, operand]) => {
      const normalizedOperand = normalizeValue(operand);

      switch (operator) {
        case "$gte":
          return normalizedItem >= normalizedOperand;
        case "$lte":
          return normalizedItem <= normalizedOperand;
        case "$gt":
          return normalizedItem > normalizedOperand;
        case "$lt":
          return normalizedItem < normalizedOperand;
        case "$in":
          return Array.isArray(operand) && operand.includes(itemValue);
        default:
          return itemValue === queryValue;
      }
    });
  }

  return itemValue === queryValue;
}

function matchesQuery(item, query) {
  return Object.entries(query).every(([key, value]) => {
    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      return compareValues(item[key], value);
    }
    return item[key] === value;
  });
}

function sortItems(items, sortObject) {
  const entries = Object.entries(sortObject || {});
  if (!entries.length) {
    return items;
  }

  return items.slice().sort((a, b) => {
    for (const [field, direction] of entries) {
      const aValue = normalizeValue(a[field]);
      const bValue = normalizeValue(b[field]);

      if (aValue < bValue) {
        return direction === -1 ? 1 : -1;
      }
      if (aValue > bValue) {
        return direction === -1 ? -1 : 1;
      }
    }
    return 0;
  });
}

function createQuery(resultSet) {
  const promise = Promise.resolve(resultSet);

  return {
    sort(sortObject) {
      const sorted = sortItems(resultSet, sortObject);
      return createQuery(sorted);
    },
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise)
  };
}

function createCollection(name) {
  if (collectionCache.has(name)) {
    return collectionCache.get(name);
  }

  let items = loadCollection(name);

  const collection = {
    find(query = {}) {
      const results = items.filter(item => matchesQuery(item, query));
      return createQuery(results);
    },

    async findOne(query = {}) {
      const result = items.find(item => matchesQuery(item, query));
      return result || null;
    },

    async findById(id) {
      return this.findOne({ _id: id });
    },

    async insert(data) {
      const now = new Date().toISOString();
      const document = {
        _id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...data
      };
      items.push(document);
      saveCollection(name, items);
      return document;
    },

    async create(data) {
      return this.insert(data);
    },

    async findOneAndUpdate(filter, update, options = {}) {
      const index = items.findIndex(item => matchesQuery(item, filter));
      if (index === -1) {
        if (options.upsert) {
          const document = {
            _id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...filter,
            ...update
          };
          items.push(document);
          saveCollection(name, items);
          return options.new ? document : document;
        }
        return null;
      }

      items[index] = {
        ...items[index],
        ...update,
        updatedAt: new Date().toISOString()
      };
      saveCollection(name, items);
      return options.new ? items[index] : items[index];
    },

    async findOneAndDelete(filter) {
      const index = items.findIndex(item => matchesQuery(item, filter));
      if (index === -1) {
        return null;
      }
      const [deleted] = items.splice(index, 1);
      saveCollection(name, items);
      return deleted;
    },

    async deleteOne(filter) {
      return this.findOneAndDelete(filter);
    }
  };

  collectionCache.set(name, collection);
  return collection;
}

function init() {
  ensureDataDir();
}

module.exports = {
  init,
  collection: createCollection
};
