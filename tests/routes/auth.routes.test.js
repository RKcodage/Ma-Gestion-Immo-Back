const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../../models/User");

jest.mock("../../config/rateLimiters", () => ({
  loginLimiter: (req, res, next) => next(),
}));

const authRoutes = require("../../routes/auth");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(authRoutes);
  return app;
};

describe("POST /user/login", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  it("renvoie 400 quand la validation échoue", async () => {
    const res = await request(app).post("/user/login").send({
      email: "not-an-email",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: "email", message: "Email invalide" },
        { field: "password", message: "Le mot de passe est requis" },
      ])
    );
  });

  it("retourne un token pour des identifiants valides", async () => {
    const password = "Password!1";
    const email = "login@example.com";
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    await User.create({
      email,
      hash,
      salt,
      role: "Propriétaire",
      profile: { firstName: "Login", lastName: "Test" },
    });

    const res = await request(app).post("/user/login").send({
      email,
      password,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toEqual(
      expect.objectContaining({
        email,
        role: "Propriétaire",
      })
    );
  });
});

describe("POST /user/signup", () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  const basePayload = {
    email: "newuser@example.com",
    password: "Password!1",
    role: "Propriétaire",
    profile: {
      firstName: "New",
      lastName: "User",
      username: "newbie",
      phone: "0601020304",
    },
  };

  it("renvoie 400 lorsque la validation échoue", async () => {
    const res = await request(app).post("/user/signup").send({
      ...basePayload,
      password: "weak",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        {
          field: "password",
          message:
            "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial",
        },
      ])
    );
  });

  it("crée un utilisateur et renvoie 201", async () => {
    const res = await request(app).post("/user/signup").send(basePayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.user).toEqual(
      expect.objectContaining({
        email: basePayload.email,
        role: basePayload.role,
        profile: expect.objectContaining({
          firstName: "New",
          lastName: "User",
        }),
      })
    );
  });

  it("renvoie 409 si l'email est déjà utilisé", async () => {
    await request(app).post("/user/signup").send(basePayload);

    const res = await request(app).post("/user/signup").send(basePayload);

    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: "Email already used" });
  });
});
