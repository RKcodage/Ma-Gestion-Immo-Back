const jwt = require("jsonwebtoken");
const isAuthenticated = require("../../middlewares/isAuthenticated");
const User = require("../../models/User");

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("isAuthenticated middleware", () => {
  let consoleErrorSpy;

  beforeAll(() => {
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renvoie 401 lorsqu'il manque le header Authorization", async () => {
    const req = { headers: {} };
    const res = mockResponse();
    const next = jest.fn();

    await isAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("renvoie 401 lorsqu'un token invalide est fourni", async () => {
    const req = { headers: { authorization: "Bearer invalid-token" } };
    const res = mockResponse();
    const next = jest.fn();

    await isAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid or expired token",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("attache l'utilisateur et appelle next lorsque le token est valide", async () => {
    const user = await User.create({
      email: "middleware@example.com",
      hash: "hash",
      role: "Propriétaire",
    });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "test"
    );

    const req = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res = mockResponse();
    const next = jest.fn();

    await isAuthenticated(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(String(req.user._id)).toBe(String(user._id));
  });
});
