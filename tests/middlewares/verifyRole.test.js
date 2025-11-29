const { ensureRole } = require("../../middlewares/verifyRole");

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("ensureRole middleware", () => {
  it("refuse l'accès si l'utilisateur n'est pas présent sur la requête", () => {
    const middleware = ensureRole("Propriétaire");
    const req = {};
    const res = mockResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Action not allowed" });
    expect(next).not.toHaveBeenCalled();
  });

  it("refuse l'accès si le rôle ne correspond pas", () => {
    const middleware = ensureRole("Propriétaire");
    const req = { user: { role: "Locataire" } };
    const res = mockResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Action not allowed" });
    expect(next).not.toHaveBeenCalled();
  });

  it("appelle next lorsque le rôle attendu est présent", () => {
    const middleware = ensureRole("Propriétaire");
    const req = { user: { role: "Propriétaire" } };
    const res = mockResponse();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
