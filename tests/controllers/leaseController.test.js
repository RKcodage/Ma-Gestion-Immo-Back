const mongoose = require("mongoose");
const {
  createLease,
} = require("../../controllers/leaseController");
const Lease = require("../../models/Lease");
const Owner = require("../../models/Owner");
const User = require("../../models/User");
const Property = require("../../models/Property");
const Unit = require("../../models/Unit");
const Tenant = require("../../models/Tenant");
const Invitation = require("../../models/Invitation");
const Notification = require("../../models/Notification");

jest.mock("../../config/mailer", () => ({
  sendMail: jest.fn(),
}));

const { sendMail } = require("../../config/mailer");

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("leaseController.createLease", () => {
  afterEach(async () => {
    jest.clearAllMocks();
    await Promise.all([
      Lease.deleteMany({}),
      Owner.deleteMany({}),
      User.deleteMany({}),
      Property.deleteMany({}),
      Unit.deleteMany({}),
      Tenant.deleteMany({}),
      Invitation.deleteMany({}),
      Notification.deleteMany({}),
    ]);
  });

  it("retourne 403 si aucun owner n'est trouvé pour l'utilisateur", async () => {
    const req = {
      user: { _id: new mongoose.Types.ObjectId() },
      body: {},
    };
    const res = mockResponse();

    await createLease(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: "Owner not found for this user",
    });
  });

  it("retourne 400 si des champs requis manquent", async () => {
    const user = await User.create({
      email: "lease-controller@example.com",
      hash: "hash",
      role: "Propriétaire",
    });
    await Owner.create({ userId: user._id });

    const req = {
      user: { _id: user._id },
      body: {},
    };
    const res = mockResponse();

    await createLease(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Missing required fields",
    });
  });

  it("crée un bail et renvoie 201", async () => {
    const ownerUser = await User.create({
      email: "lease-owner@example.com",
      hash: "hash",
      role: "Propriétaire",
    });
    const owner = await Owner.create({ userId: ownerUser._id });

    const property = await Property.create({
      ownerId: owner._id,
      address: "10 rue des Baux",
      city: "Paris",
      type: "Appartement",
    });

    const unit = await Unit.create({
      propertyId: property._id,
      label: "B1",
      type: "Appartement",
    });

    const tenantUser = await User.create({
      email: "lease-tenant@example.com",
      hash: "hash",
      role: "Locataire",
    });
    const tenant = await Tenant.create({ userId: tenantUser._id });

    const req = {
      user: { _id: ownerUser._id },
      body: {
        unitId: unit._id,
        tenantEmails: [tenantUser.email],
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        rentAmount: 1000,
        chargesAmount: 150,
        deposit: 800,
        paymentDate: 10,
      },
    };
    const res = mockResponse();

    await createLease(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Lease created successfully",
        invitationsSent: [],
      })
    );

    const stored = await Lease.findOne({ unitId: unit._id });
    expect(stored).not.toBeNull();
    expect(String(stored.ownerId)).toBe(String(owner._id));
    expect(stored.tenants.map(String)).toContain(String(tenant._id));
    expect(sendMail).toHaveBeenCalled();
  });
});
