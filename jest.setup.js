const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

process.env.NODE_ENV = "test";

const envFile = path.resolve(__dirname, ".env.test");
dotenv.config({ path: envFile });

beforeAll(() => {
  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/ma-gestion-immo-test";
  }
  if (!process.env.PORT) {
    process.env.PORT = "0";
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
