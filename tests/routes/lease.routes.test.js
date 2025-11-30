const request = require("supertest");
const express = require("express");
const mongoose = require("mongoose");
const Lease = require("../../models/Lease");
const User = require("../../models/User");
const Owner = require("../../models/Owner");
const Property = require("../../models/Property");
const Unit = require("../../models/Unit");
const Tenant = require("../../models/Tenant");
const Notification = require("../../models/Notification");
const Invitation = require("../../models/Invitation");

jest.mock("../../middlewares/isAuthenticated", () => {
  const mongoose = require("mongoose");
  return (req, res, next) => {
    req.user = {
      _id: global.__AUTH_USER_ID || new mongoose.Types.ObjectId(),
      role: "Propriétaire",
    };
    next();
  };
});

jest.mock("../../middlewares/verifyRole", () => ({
  ensureRole: () => (req, res, next) => next(),
}));

jest.mock("../../config/mailer", () => ({
  sendMail: jest.fn(),
}));

const leaseRoutes = require("../../routes/lease");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(leaseRoutes);
  return app;
};

describe("POST /lease", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  afterEach(async () => {
    global.__AUTH_USER_ID = undefined;
    await Promise.all([
      Lease.deleteMany({}),
      Property.deleteMany({}),
      Unit.deleteMany({}),
      Owner.deleteMany({}),
      User.deleteMany({}),
      Tenant.deleteMany({}),
      Notification.deleteMany({}),
      Invitation.deleteMany({}),
    ]);
  });

  it("retourne 403 si aucun owner n'est associé à l'utilisateur", async () => {
    global.__AUTH_USER_ID = new mongoose.Types.ObjectId();

    const res = await request(app).post("/lease").send({
      unitId: new mongoose.Types.ObjectId(),
      tenantEmails: ["tenant@example.com"],
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      rentAmount: 1000,
      chargesAmount: 200,
      paymentDate: 5,
    });

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      message: "Owner not found for this user",
    });
  });

  it("retourne 400 si des champs requis sont manquants", async () => {
    const ownerUser = await User.create({
      email: "owner-route@example.com",
      hash: "hash",
      role: "Propriétaire",
    });
    await Owner.create({ userId: ownerUser._id });
    global.__AUTH_USER_ID = ownerUser._id;

    const res = await request(app).post("/lease").send({
      tenantEmails: [],
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ message: "Missing required fields" });
  });

  it("crée un bail et renvoie 201", async () => {
    const ownerUser = await User.create({
      email: "owner-success@example.com",
      hash: "hash",
      role: "Propriétaire",
    });
    const owner = await Owner.create({ userId: ownerUser._id });
    global.__AUTH_USER_ID = ownerUser._id;

    const property = await Property.create({
      ownerId: owner._id,
      address: "1 rue du Bail",
      city: "Paris",
      type: "Appartement",
    });

    const unit = await Unit.create({
      propertyId: property._id,
      label: "A1",
      type: "Appartement",
    });

    const tenantUser = await User.create({
      email: "tenant1@example.com",
      hash: "hash",
      role: "Locataire",
    });
    const tenant = await Tenant.create({ userId: tenantUser._id });

    const res = await request(app).post("/lease").send({
      unitId: unit._id,
      tenantEmails: [tenantUser.email],
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      rentAmount: 1200,
      chargesAmount: 150,
      deposit: 1000,
      paymentDate: 5,
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: "Lease created successfully",
        invitationsSent: [],
      })
    );

    const storedLease = await Lease.findOne({ unitId: unit._id });
    expect(storedLease).not.toBeNull();
    expect(String(storedLease.ownerId)).toBe(String(owner._id));
    expect(storedLease.tenants.map(String)).toContain(String(tenant._id));
  });
});
