const {
  createUnit,
} = require("../../controllers/unitController");
const Unit = require("../../models/Unit");
const Property = require("../../models/Property");
const Owner = require("../../models/Owner");
const User = require("../../models/User");

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("unitController.createUnit", () => {
  afterEach(async () => {
    await Promise.all([
      Unit.deleteMany({}),
      Property.deleteMany({}),
      Owner.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  it("retourne 400 quand des champs obligatoires manquent", async () => {
    const req = { body: {} };
    const res = mockResponse();

    await createUnit(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing required fields",
    });
  });

  it("crée une unité et renvoie 201", async () => {
    const user = await User.create({
      email: "unit-controller@example.com",
      hash: "hash",
      role: "Propriétaire",
    });
    const owner = await Owner.create({ userId: user._id });
    const property = await Property.create({
      ownerId: owner._id,
      address: "8 rue des Unités",
      city: "Lille",
      type: "Appartement",
    });

    const req = {
      body: {
        propertyId: property._id,
        label: "Studio A",
        type: "Appartement",
        surface: 25,
      },
    };
    const res = mockResponse();

    await createUnit(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Studio A",
        type: "Appartement",
      })
    );

    const stored = await Unit.findOne({ label: "Studio A" });
    expect(stored).not.toBeNull();
    expect(String(stored.propertyId)).toBe(String(property._id));
  });
});
