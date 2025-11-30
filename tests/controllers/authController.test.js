const { forgotPassword } = require("../../controllers/authController");
const User = require("../../models/User");

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

describe("authController.forgotPassword", () => {
  it("retourne 404 si aucun utilisateur n'est trouvé", async () => {
    const req = { body: { email: "missing@example.com" } };
    const res = mockResponse();

    await forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("génère un token et envoie un email pour un utilisateur existant", async () => {
    const email = "forgot@example.com";
    const user = await User.create({
      email,
      hash: "hash",
      role: "Locataire",
      profile: { firstName: "Forgot", lastName: "Test" },
    });
    const req = { body: { email } };
    const res = mockResponse();

    await forgotPassword(req, res);

    const updatedUser = await User.findById(user._id);

    expect(updatedUser.resetPasswordToken).toBeDefined();
    expect(updatedUser.resetPasswordExpires.getTime()).toBeGreaterThan(
      Date.now()
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        subject: "Réinitialisation de votre mot de passe",
      })
    );
    expect(res.json).toHaveBeenCalledWith({
      message: "Reset password email sent",
    });
  });
});
