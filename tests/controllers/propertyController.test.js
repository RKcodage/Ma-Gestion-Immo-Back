const {
  createProperty,
} = require("../../controllers/propertyController");
const Property = require("../../models/Property");
const Owner = require("../../models/Owner");
const User = require("../../models/User");

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("propertyController.createProperty", () => {
  afterEach(async () => {
    await Property.deleteMany({});
    await Owner.deleteMany({});
    await User.deleteMany({});
  });

  it("renvoie 400 quand les champs requis sont absents", async () => {
    const req = { body: {} };
    const res = mockResponse();

    await createProperty(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing required fields",
    });
  });

  it("crée une propriété et renvoie 201", async () => {
    const user = await User.create({
      email: "owner2@example.com",
      hash: "hash",
      role: "Propriétaire",
    });
    const owner = await Owner.create({ userId: user._id });

    const req = {
      body: {
        ownerId: owner._id,
        address: "456 avenue des Tests",
        city: "Lyon",
        type: "Maison",
      },
    };
    const res = mockResponse();

    await createProperty(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "456 avenue des Tests",
        city: "Lyon",
        type: "Maison",
      })
    );

    const stored = await Property.findOne({ address: "456 avenue des Tests" });
    expect(stored).not.toBeNull();
  });
});
