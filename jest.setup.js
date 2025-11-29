const path = require("path");
const dotenv = require("dotenv");
const {
  connect,
  clearDatabase,
  closeDatabase,
} = require("./tests/utils/test-db-handler");

process.env.NODE_ENV = "test";

const envFile = path.resolve(__dirname, ".env.test");
dotenv.config({ path: envFile });

beforeAll(async () => {
  if (!process.env.PORT) {
    process.env.PORT = "0";
  }
  await connect();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});
