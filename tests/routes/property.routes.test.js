const request = require("supertest");
const express = require("express");
const User = require("../../models/User");
const Owner = require("../../models/Owner");
const Property = require("../../models/Property");

jest.mock("../../middlewares/isAuthenticated", () => {
  const mongoose = require("mongoose");
  return (req, res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId(), role: "Propriétaire" };
    next();
  };
});

const propertyRoutes = require("../../routes/property");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(propertyRoutes);
  return app;
};

describe("POST /property", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(async () => {
    await Property.deleteMany({});
    await Owner.deleteMany({});
    await User.deleteMany({});
  });

  it("retourne 400 quand des champs requis sont manquants", async () => {
    const res = await request(app).post("/property").send({});

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Missing required fields" });
  });

  it("crée une propriété et renvoie 201", async () => {
    const user = await User.create({
      email: "owner@example.com",
      hash: "hash",
      role: "Propriétaire",
      profile: { firstName: "Owner", lastName: "Test" },
    });
    const owner = await Owner.create({ userId: user._id });

    const payload = {
      ownerId: owner._id,
      address: "123 rue du Test",
      city: "Paris",
      postalCode: "75000",
      description: "Bel appartement",
      type: "Appartement",
      surface: 80,
      rooms: 3,
      rent: 1200,
      charges: 150,
    };

    const res = await request(app).post("/property").send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        address: payload.address,
        city: payload.city,
        type: payload.type,
      })
    );

    const stored = await Property.findOne({ address: payload.address });
    expect(stored).not.toBeNull();
    expect(String(stored.ownerId)).toBe(String(owner._id));
  });
});
