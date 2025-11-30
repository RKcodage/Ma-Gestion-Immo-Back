const request = require("supertest");
const express = require("express");
const Unit = require("../../models/Unit");
const Property = require("../../models/Property");
const Owner = require("../../models/Owner");
const User = require("../../models/User");

jest.mock("../../middlewares/isAuthenticated", () => (req, res, next) => {
  req.user = { _id: "user-id" };
  next();
});

const unitRoutes = require("../../routes/unit");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(unitRoutes);
  return app;
};

describe("POST /unit", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(async () => {
    await Promise.all([
      Unit.deleteMany({}),
      Property.deleteMany({}),
      Owner.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  it("retourne 400 quand le payload est incomplet", async () => {
    const res = await request(app).post("/unit").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Missing required fields" });
  });

  it("crée une unité et renvoie 201", async () => {
    const user = await User.create({
      email: "unit-owner@example.com",
      hash: "hash",
      role: "Propriétaire",
    });
    const owner = await Owner.create({ userId: user._id });
    const property = await Property.create({
      ownerId: owner._id,
      address: "5 rue des Units",
      city: "Bordeaux",
      type: "Maison",
    });

    const payload = {
      propertyId: property._id,
      label: "Unité 1",
      type: "Appartement",
      floor: "2",
      surface: 60,
    };

    const res = await request(app).post("/unit").send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        label: payload.label,
        type: payload.type,
      })
    );

    const stored = await Unit.findOne({ label: payload.label });
    expect(stored).not.toBeNull();
    expect(String(stored.propertyId)).toBe(String(property._id));
  });
});
