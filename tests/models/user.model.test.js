const User = require("../../models/User");

describe("User model", () => {
  it("crée un utilisateur avec les champs requis", async () => {
    const email = "user@example.com";
    await User.create({
      email,
      hash: "hashed-password",
      role: "Propriétaire",
      profile: { firstName: "Ada", lastName: "Lovelace" },
    });

    const storedUser = await User.findOne({ email });
    expect(storedUser).not.toBeNull();
    expect(storedUser.profile.firstName).toBe("Ada");
  });

  it("applique la contrainte d'unicité sur l'email", async () => {
    const email = "unique@example.com";
    await User.create({ email, hash: "hash", role: "Locataire" });

    await expect(
      User.create({ email, hash: "hash2", role: "Locataire" })
    ).rejects.toMatchObject({ code: 11000 });
  });
});
